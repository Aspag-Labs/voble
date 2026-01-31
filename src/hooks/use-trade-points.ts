import { useState, useEffect } from 'react'
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana'
import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  compileTransaction,
  getTransactionEncoder,
  createSolanaRpc,
  address,
  getProgramDerivedAddress,
  getAddressEncoder,
  getBase58Decoder,
  type Address,
  type Instruction,
} from '@solana/kit'
import { toast } from 'sonner'

import { getUserProfilePDA, getVobleVaultPDA } from './pdas'
import { getTradeActivityPointsInstructionAsync, fetchMaybeUserProfile, VOBLE_PROGRAM_ADDRESS } from '@clients/js/src/generated'

// Voble Token Mint (Devnet) - This is a placeholder, updated via setup-voble-token.ts
const VOBLE_MINT = 'vobNFs6WV5gFZZ1E529D87sJ9LprZ2TxoRm3TREGzK6' as Address

// Token Program
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address

// Associated Token Program
const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address

export interface TradePointsResult {
  tradePoints: (points: number) => Promise<{ success: boolean; error?: string; signature?: string }>
  isTrading: boolean
  isTradingEnabled: boolean // false if voble vault doesn't exist yet
  isCheckingAvailability: boolean
  error: string | null
}

/**
 * Derive the Associated Token Account address
 */
async function getAssociatedTokenAddress(mint: Address, owner: Address): Promise<Address> {
  const [ata] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ID,
    seeds: [
      getAddressEncoder().encode(owner),
      getAddressEncoder().encode(TOKEN_PROGRAM_ID),
      getAddressEncoder().encode(mint),
    ],
  })
  return ata
}

/**
 * Create instruction for Associated Token Account
 */
function createAssociatedTokenAccountInstruction(
  payer: Address,
  associatedToken: Address,
  owner: Address,
  mint: Address,
): Instruction {
  return {
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ID,
    accounts: [
      { address: payer, role: 3 }, // writable signer
      { address: associatedToken, role: 1 }, // writable
      { address: owner, role: 0 }, // readonly
      { address: mint, role: 0 }, // readonly
      { address: '11111111111111111111111111111111' as Address, role: 0 }, // system program
      { address: TOKEN_PROGRAM_ID, role: 0 }, // token program
    ],
    data: new Uint8Array([]), // ATA instruction has no data
  }
}

export function useTradeActivityPoints(): TradePointsResult {
  const { wallets } = useWallets()
  const { signAndSendTransaction } = useSignAndSendTransaction()
  const wallet = wallets[0]
  const [isTrading, setIsTrading] = useState(false)
  const [isTradingEnabled, setIsTradingEnabled] = useState(false)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if voble vault exists (trading is only enabled after token setup)
  useEffect(() => {
    const checkVaultExists = async () => {
      try {
        const rpc = createSolanaRpc('/api/rpc')
        const [vobleVaultPda] = await getVobleVaultPDA()
        const vaultInfo = await rpc.getAccountInfo(vobleVaultPda, { encoding: 'base64' }).send()
        setIsTradingEnabled(!!vaultInfo.value)
      } catch (err) {
        console.error('[useTradePoints] Error checking vault:', err)
        setIsTradingEnabled(false)
      } finally {
        setIsCheckingAvailability(false)
      }
    }
    checkVaultExists()
  }, [])

  const tradePoints = async (points: number): Promise<{ success: boolean; error?: string; signature?: string }> => {
    if (!isTradingEnabled) {
      console.error('[useTradePoints] Trading not enabled yet')
      return { success: false, error: 'Token trading coming soon!' }
    }

    if (!wallet) {
      console.error('[useTradePoints] Wallet not connected')
      return { success: false, error: 'Wallet not connected' }
    }

    if (points <= 0) {
      console.error('[useTradePoints] Invalid points:', points)
      return { success: false, error: 'Points must be greater than 0' }
    }

    setIsTrading(true)
    setError(null)

    try {
      const playerAddress = address(wallet.address)
      const rpc = createSolanaRpc('/api/rpc')

      // Check user profile and points
      const [userProfilePda] = await getUserProfilePDA(playerAddress)
      const maybeProfile = await fetchMaybeUserProfile(rpc, userProfilePda)

      if (!maybeProfile.exists) {
        console.error('[useTradePoints] User profile not found:', userProfilePda)
        return { success: false, error: 'User profile not found' }
      }

      if (maybeProfile.data.activityPoints < BigInt(points)) {
        console.error('[useTradePoints] Insufficient points:', {
          current: maybeProfile.data.activityPoints.toString(),
          required: points,
        })
        return { success: false, error: 'Insufficient activity points' }
      }

      // Get User ATA for VOBLE token
      const userTokenAccount = await getAssociatedTokenAddress(VOBLE_MINT, playerAddress)

      // Build instructions array
      const instructions: Instruction[] = []

      // Check if ATA exists, create if not
      const ataAccountInfo = await rpc.getAccountInfo(userTokenAccount, { encoding: 'base64' }).send()
      if (!ataAccountInfo.value) {
        instructions.push(
          createAssociatedTokenAccountInstruction(playerAddress, userTokenAccount, playerAddress, VOBLE_MINT),
        )
      }

      // Create a TransactionSigner from wallet
      const walletSigner = {
        address: playerAddress,
        signTransactions: async () => {
          throw new Error('Not used')
        },
      }

      // Add trade instruction
      const tradeIx = await getTradeActivityPointsInstructionAsync({
        player: walletSigner,
        userTokenAccount,
        vobleMint: VOBLE_MINT,
        pointsToTrade: points,
        program: VOBLE_PROGRAM_ADDRESS,
      })

      instructions.push(tradeIx)

      // Get blockhash and build transaction
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(playerAddress, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions(instructions, tx),
        (tx) => compileTransaction(tx),
        (tx) => new Uint8Array(getTransactionEncoder().encode(tx)),
      )

      // Send the transaction
      const result = await signAndSendTransaction({
        transaction: transactionMessage,
        wallet: wallet,
      })

      const signature = getBase58Decoder().decode(result.signature)

      // Success toast with clickable link
      toast.success('Points traded for $VOBLE tokens!', {
        description: `${signature.slice(0, 8)}...${signature.slice(-8)}`,
        action: {
          label: 'View on Solscan',
          onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank'),
        },
        duration: 5000,
      })

      return {
        success: true,
        signature,
      }
    } catch (err: unknown) {
      const typedErr = err as Error & { message?: string; logs?: string[] }
      console.error('[useTradePoints] Error trading points:', err)
      if (typedErr.logs) {
        console.error('[useTradePoints] Simulation logs:', typedErr.logs)
      }
      const errorMessage = typedErr.message || 'Failed to trade points'
      setError(errorMessage)

      toast.error('Failed to trade points', {
        description: errorMessage,
        duration: 5000,
      })

      return { success: false, error: errorMessage }
    } finally {
      setIsTrading(false)
    }
  }

  return {
    tradePoints,
    isTrading,
    isTradingEnabled,
    isCheckingAvailability,
    error,
  }
}
