import { useState, useCallback } from 'react'
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
  type Address,
  getBase58Decoder,
} from '@solana/kit'
import { toast } from 'sonner'

import { getWinnerEntitlementPDA, getLuckyDrawStatePDA } from './pdas'
import {
  getClaimDailyInstructionAsync,
  getClaimWeeklyInstructionAsync,
  getClaimMonthlyInstructionAsync,
  fetchMaybeWinnerEntitlement,
  getClaimLuckyDrawPrizeInstructionAsync,
  fetchMaybeLuckyDrawState,
  VOBLE_PROGRAM_ADDRESS,
  getWinnerEntitlementDecoder,
  getLuckyDrawStateDecoder,
} from '@clients/js/src/generated'

// USDC Mint on Devnet
const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' as Address

export type PrizePeriodType = 'daily' | 'weekly' | 'monthly'

export interface ClaimResult {
  success: boolean
  signature?: string
  error?: string
}

export interface UnclaimedPrize {
  periodType: PrizePeriodType
  periodId: string
  amount: number
  rank: number
  address: Address
}

export interface UnclaimedRaffle {
  periodId: string
  amount: number
  winningIndex: number
  address: Address
}

export function useClaim() {
  const { wallets } = useWallets()
  const { signAndSendTransaction } = useSignAndSendTransaction()
  const wallet = wallets[0]

  const [isClaimingPrize, setIsClaimingPrize] = useState(false)
  const [isClaimingLuckyDraw, setIsClaimingLuckyDraw] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- CLAIM LEADERBOARD PRIZE ---
  const claimPrize = useCallback(
    async (periodType: PrizePeriodType, periodId: string): Promise<ClaimResult> => {
      setIsClaimingPrize(true)
      setError(null)

      try {
        if (!wallet?.address) throw new Error('No wallet connected')
        if (!periodId?.trim()) throw new Error('Period ID is required')

        const playerAddress = address(wallet.address)
        const [entitlementPda] = await getWinnerEntitlementPDA(playerAddress, periodType, periodId.trim())
        const rpc = createSolanaRpc('/api/rpc')

        // Validate entitlement
        const maybeEntitlement = await fetchMaybeWinnerEntitlement(rpc, entitlementPda)
        if (!maybeEntitlement.exists) throw new Error('No prize available')
        if (maybeEntitlement.data.claimed) throw new Error('Prize already claimed')
        if (maybeEntitlement.data.amount <= 0n) throw new Error('Invalid prize amount')

        // Build instruction
        const walletSigner = {
          address: playerAddress,
          signTransactions: async () => {
            throw new Error('Not used')
          },
        }

        let ix
        if (periodType === 'daily') {
          ix = await getClaimDailyInstructionAsync({
            winnerEntitlement: entitlementPda,
            winner: walletSigner,
            usdcMint: USDC_MINT,
            program: VOBLE_PROGRAM_ADDRESS,
          })
        } else if (periodType === 'weekly') {
          ix = await getClaimWeeklyInstructionAsync({
            winnerEntitlement: entitlementPda,
            winner: walletSigner,
            usdcMint: USDC_MINT,
            program: VOBLE_PROGRAM_ADDRESS,
          })
        } else {
          ix = await getClaimMonthlyInstructionAsync({
            winnerEntitlement: entitlementPda,
            winner: walletSigner,
            usdcMint: USDC_MINT,
            program: VOBLE_PROGRAM_ADDRESS,
          })
        }

        // Build transaction
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          (tx) => setTransactionMessageFeePayer(playerAddress, tx),
          (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
          (tx) => appendTransactionMessageInstructions([ix], tx),
          (tx) => compileTransaction(tx),
          (tx) => new Uint8Array(getTransactionEncoder().encode(tx)),
        )

        // Sign and send
        const result = await signAndSendTransaction({
          transaction: transactionMessage,
          wallet: wallet,
        })

        const signature = getBase58Decoder().decode(result.signature)

        // Success toast with clickable link
        toast.success('Prize claimed successfully!', {
          description: `${signature.slice(0, 8)}...${signature.slice(-8)}`,
          action: {
            label: 'View on Solscan',
            onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank'),
          },
          duration: 5000,
        })

        return { success: true, signature }
      } catch (err: any) {
        console.error('[useClaim] claimPrize:error', err)
        const msg = err?.message || 'Failed to claim prize'
        setError(msg)

        toast.error('Failed to claim prize', {
          description: msg,
          duration: 5000,
        })

        return { success: false, error: msg }
      } finally {
        setIsClaimingPrize(false)
      }
    },
    [wallet, signAndSendTransaction],
  )

  // --- CLAIM LUCKY DRAW PRIZE ---
  const claimLuckyDraw = useCallback(
    async (periodId: string): Promise<ClaimResult> => {
      setIsClaimingLuckyDraw(true)
      setError(null)

      try {
        if (!wallet?.address) throw new Error('No wallet connected')
        if (!periodId?.trim()) throw new Error('Period ID is required')

        const playerAddress = address(wallet.address)
        const trimmedId = periodId.trim()
        const [statePda] = await getLuckyDrawStatePDA(trimmedId)
        const rpc = createSolanaRpc('/api/rpc')

        // Validate state
        const maybeState = await fetchMaybeLuckyDrawState(rpc, statePda)
        if (!maybeState.exists) throw new Error('No lucky draw prize available')
        if (maybeState.data.isClaimed) throw new Error('Lucky draw prize already claimed')
        if (maybeState.data.isPending) throw new Error('Lucky draw VRF still pending')

        // Fetch Merkle proof from API
        const proofResponse = await fetch(
          `/api/lucky-draw?periodId=${encodeURIComponent(trimmedId)}&wallet=${wallet.address}`,
        )
        if (!proofResponse.ok) {
          const errorData = await proofResponse.json()
          throw new Error(errorData.error || 'Failed to get Merkle proof')
        }
        const proofData = await proofResponse.json()

        // Convert hex strings to Uint8Array
        const merkleProof = proofData.merkleProof.map((hex: string) => {
          const bytes = new Uint8Array(32)
          for (let i = 0; i < 32; i++) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
          }
          return Array.from(bytes) as unknown as Uint8Array
        })

        // Build instruction
        const walletSigner = {
          address: playerAddress,
          signTransactions: async () => {
            throw new Error('Not used')
          },
        }

        const ix = await getClaimLuckyDrawPrizeInstructionAsync({
          payer: walletSigner,
          winner: playerAddress,
          usdcMint: USDC_MINT,
          periodId: trimmedId,
          merkleProof,
          program: VOBLE_PROGRAM_ADDRESS,
        })

        // Build transaction
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          (tx) => setTransactionMessageFeePayer(playerAddress, tx),
          (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
          (tx) => appendTransactionMessageInstructions([ix], tx),
          (tx) => compileTransaction(tx),
          (tx) => new Uint8Array(getTransactionEncoder().encode(tx)),
        )

        // Sign and send
        const result = await signAndSendTransaction({
          transaction: transactionMessage,
          wallet: wallet,
        })

        const signature = getBase58Decoder().decode(result.signature)

        // Success toast with clickable link
        toast.success('Raffle prize claimed successfully!', {
          description: `${signature.slice(0, 8)}...${signature.slice(-8)}`,
          action: {
            label: 'View on Solscan',
            onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank'),
          },
          duration: 5000,
        })

        return { success: true, signature }
      } catch (err: any) {
        console.error('[useClaim] claimLuckyDraw:error', err)
        const msg = err?.message || 'Failed to claim lucky draw'
        setError(msg)

        toast.error('Failed to claim raffle prize', {
          description: msg,
          duration: 5000,
        })

        return { success: false, error: msg }
      } finally {
        setIsClaimingLuckyDraw(false)
      }
    },
    [wallet, signAndSendTransaction],
  )

  // --- BLOCKCHAIN-BASED PRIZE DISCOVERY ---

  const getAllUnclaimedPrizes = useCallback(async (): Promise<UnclaimedPrize[]> => {
    if (!wallet?.address) return []

    try {
      const playerAddress = address(wallet.address)
      const rpc = createSolanaRpc('/api/rpc')

      const response = await rpc
        .getProgramAccounts(VOBLE_PROGRAM_ADDRESS, {
          encoding: 'base64',
          filters: [{ memcmp: { offset: 8n, bytes: playerAddress as any, encoding: 'base58' } }],
        })
        .send()

      const decoder = getWinnerEntitlementDecoder()
      const unclaimed: UnclaimedPrize[] = []

      for (const account of response as any[]) {
        try {
          let dataBytes: Uint8Array
          if (Array.isArray(account.account.data)) {
            dataBytes = new Uint8Array(Buffer.from(account.account.data[0], 'base64'))
          } else if (account.account.data instanceof Uint8Array) {
            dataBytes = account.account.data
          } else {
            continue
          }

          const entitlement = decoder.decode(dataBytes)

          if (!entitlement.claimed && entitlement.amount > 0n) {
            let periodType: PrizePeriodType = 'daily'
            const pt = entitlement.periodType as any
            if (pt?.Weekly !== undefined || pt === 'Weekly' || pt === 1) periodType = 'weekly'
            else if (pt?.Monthly !== undefined || pt === 'Monthly' || pt === 2) periodType = 'monthly'

            unclaimed.push({
              periodType,
              periodId: entitlement.periodId,
              amount: Number(entitlement.amount),
              rank: entitlement.rank,
              address: account.pubkey,
            })
          }
        } catch (decodeErr) {
          console.warn('[getAllUnclaimedPrizes] Failed to decode account:', account.pubkey, decodeErr)
        }
      }

      console.log('[getAllUnclaimedPrizes] Found', unclaimed.length, 'unclaimed prizes')
      return unclaimed
    } catch (err: any) {
      console.error('[getAllUnclaimedPrizes] Error:', err)
      return []
    }
  }, [wallet])

  const getAllUnclaimedRaffles = useCallback(async (): Promise<UnclaimedRaffle[]> => {
    if (!wallet?.address) return []

    try {
      const rpc = createSolanaRpc('/api/rpc')

      const response = await rpc
        .getProgramAccounts(VOBLE_PROGRAM_ADDRESS, {
          encoding: 'base64',
        })
        .send()

      const decoder = getLuckyDrawStateDecoder()
      const unclaimed: UnclaimedRaffle[] = []

      for (const account of response as any[]) {
        try {
          let dataBytes: Uint8Array
          if (Array.isArray(account.account.data)) {
            dataBytes = new Uint8Array(Buffer.from(account.account.data[0], 'base64'))
          } else if (account.account.data instanceof Uint8Array) {
            dataBytes = account.account.data
          } else {
            continue
          }

          if (dataBytes.length !== 55) continue

          const state = decoder.decode(dataBytes)

          if (!state.isClaimed && !state.isPending && state.amount > 0n) {
            const periodIdBytes = state.periodId as unknown as Uint8Array
            const periodId = new TextDecoder().decode(periodIdBytes).replace(/\0/g, '').trim()

            if (!periodId) continue

            try {
              const proofResponse = await fetch(
                `/api/lucky-draw?periodId=${encodeURIComponent(periodId)}&wallet=${wallet.address}`,
              )
              if (proofResponse.ok) {
                unclaimed.push({
                  periodId,
                  amount: Number(state.amount),
                  winningIndex: state.winningIndex,
                  address: account.pubkey,
                })
              }
            } catch {
              // Player is not the winner for this raffle
            }
          }
        } catch {
          // Skip accounts that aren't LuckyDrawState
        }
      }

      console.log('[getAllUnclaimedRaffles] Found', unclaimed.length, 'unclaimed raffles')
      return unclaimed
    } catch (err: any) {
      console.error('[getAllUnclaimedRaffles] Error:', err)
      return []
    }
  }, [wallet])

  return {
    claimPrize,
    claimLuckyDraw,
    isClaimingPrize,
    isClaimingLuckyDraw,
    getAllUnclaimedPrizes,
    getAllUnclaimedRaffles,
    error,
  }
}
