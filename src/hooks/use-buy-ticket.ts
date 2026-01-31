import { useState } from 'react'
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana'
import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  getTransactionEncoder,
  address,
  getSignatureFromTransaction,
  signTransactionMessageWithSigners,
  sendTransactionWithoutConfirmingFactory,
  getBase58Decoder,
  getBase64EncodedWireTransaction,
} from '@solana/kit'

import { getBuyTicketAndStartGameInstructionAsync, getResetSessionInstruction } from '@clients/js/src/generated'

import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token'

import { useTempKeypair } from '@/hooks/use-temp-keypair'
import { getTargetWordPDA, getSessionPDA, getUserProfilePDA } from '@/hooks/pdas'
import { usePrivateRollupAuth } from '@/hooks/use-private-rollup-auth'

import { handleTransactionError } from './utils'

export interface BuyTicketResult {
  success: boolean
  signature?: string
  error?: string
  sessionId?: string
}

export function useBuyTicket() {
  const { wallets } = useWallets()
  const { signAndSendTransaction } = useSignAndSendTransaction()
  const tempKeypair = useTempKeypair()
  const { getToken } = usePrivateRollupAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketPurchased, setTicketPurchased] = useState(false)
  const [vrfCompleted, setVrfCompleted] = useState(false)

  const wallet = wallets[0]

  const buyTicket = async (periodId: string): Promise<BuyTicketResult> => {
    setIsLoading(true)
    setError(null)
    setTicketPurchased(false)
    setVrfCompleted(false)

    // Capture tempKeypair at function start to avoid stale closure issues
    const currentTempKeypair = tempKeypair

    try {
      // Validate inputs
      if (!wallet) {
        throw new Error('No wallet connected')
      }

      if (!wallet.address) {
        throw new Error('Wallet not properly connected')
      }

      if (!periodId || periodId.trim().length === 0) {
        throw new Error('Period ID is required')
      }

      const trimmedPeriodId = periodId.trim()

      // === CHECK LEADERBOARD INITIALIZATION ===
      try {
        const { getCurrentPeriodIds, getLeaderboardPDA } = await import('@/hooks/pdas')
        const periodIds = getCurrentPeriodIds()

        const [dailyLeaderboardPda] = await getLeaderboardPDA(periodIds.daily, 'daily')
        const [weeklyLeaderboardPda] = await getLeaderboardPDA(periodIds.weekly, 'weekly')
        const [monthlyLeaderboardPda] = await getLeaderboardPDA(periodIds.monthly, 'monthly')

        const rpc = createSolanaRpc('/api/rpc')
        const [dailyInfo, weeklyInfo, monthlyInfo] = await Promise.all([
          rpc.getAccountInfo(dailyLeaderboardPda, { encoding: 'base64' }).send(),
          rpc.getAccountInfo(weeklyLeaderboardPda, { encoding: 'base64' }).send(),
          rpc.getAccountInfo(monthlyLeaderboardPda, { encoding: 'base64' }).send(),
        ])

        const missingLeaderboards: string[] = []
        if (!dailyInfo.value) missingLeaderboards.push(`daily (${periodIds.daily})`)
        if (!weeklyInfo.value) missingLeaderboards.push(`weekly (${periodIds.weekly})`)
        if (!monthlyInfo.value) missingLeaderboards.push(`monthly (${periodIds.monthly})`)

        if (missingLeaderboards.length > 0) {
          throw new Error(
            `Leaderboards for this period haven't been initialized yet. Missing: ${missingLeaderboards.join(', ')}. Please try again later or contact support.`
          )
        }
      } catch (leaderboardErr: unknown) {
        const typedErr = leaderboardErr as Error & { message?: string }
        if (typedErr?.message?.includes('Leaderboards for this period')) {
          throw leaderboardErr
        }
        console.error('Failed to check leaderboard initialization:', leaderboardErr)
        throw new Error(
          'Unable to verify leaderboard status. Please try again later.'
        )
      }

      // === PRE-FLIGHT CHECK: Simulate Reset Session on TEE BEFORE buying ticket ===
      let preFlightData: {
        targetWordPda: Awaited<ReturnType<typeof getTargetWordPDA>>[0]
        sessionPda: Awaited<ReturnType<typeof getSessionPDA>>[0]
        userProfilePda: Awaited<ReturnType<typeof getUserProfilePDA>>[0]
        teeRpc: ReturnType<typeof createSolanaRpc>
        alreadySent: boolean
      } | null = null

      if (currentTempKeypair) {
        try {
          // Derive PDAs necessary
          const [targetWordPda] = await getTargetWordPDA(address(wallet.address))
          const [sessionPda] = await getSessionPDA(address(wallet.address))
          const [userProfilePda] = await getUserProfilePDA(address(wallet.address))

          // create reset session instruction (VRF disabled for demo - no oracleQueue needed)
          const resetSessionIx = getResetSessionInstruction({
            payer: currentTempKeypair.signer,
            session: sessionPda,
            targetWord: targetWordPda,
            userProfile: userProfilePda,
            periodId: trimmedPeriodId,
          })

          // Get auth token for TEE connection
          const authToken = await getToken()
          if (!authToken) {
            throw new Error('Failed to authenticate with TEE')
          }

          // initialize connection to TEE magicblock endpoint (for Private ER)
          const teeUrl = `https://tee.magicblock.app?token=${authToken}`
          const teeRpc = createSolanaRpc(teeUrl)

          // get latest blockhash from TEE
          const { value: teeBlockhash } = await teeRpc.getLatestBlockhash().send()

          // Build transaction message for simulation only
          const resetTxMessage = pipe(
            createTransactionMessage({ version: 0 }),
            (tx) => setTransactionMessageFeePayerSigner(currentTempKeypair.signer, tx),
            (tx) => setTransactionMessageLifetimeUsingBlockhash(teeBlockhash, tx),
            (tx) => appendTransactionMessageInstructions([resetSessionIx], tx),
          )

          // sign transaction for simulation
          const signedResetTx = await signTransactionMessageWithSigners(resetTxMessage)

          // Encode the signed transaction to base64 for simulation
          const encodedTx = getBase64EncodedWireTransaction(signedResetTx)

          const simulationResult = await teeRpc
            .simulateTransaction(encodedTx as unknown as Parameters<typeof teeRpc.simulateTransaction>[0], {
              encoding: 'base64',
            })
            .send()

          // Check simulation result for TEE availability
          // With the new security check, reset_session will fail with InvalidTicketReceipt
          // This is EXPECTED - it means TEE is working, we just need to pay first
          if (simulationResult.value.err) {
            // BigInt-safe JSON serializer
            const safeStringify = (obj: unknown) => JSON.stringify(obj, (_, v) =>
              typeof v === 'bigint' ? v.toString() : v
            )
            const errJson = safeStringify(simulationResult.value.err)
            const logs = simulationResult.value.logs?.join(' ') || ''

            // Check if this is a program error (TEE is working, just state/permission issue)
            // Error codes: InvalidTicketReceipt (0x178f = 6031), TicketAlreadyUsed (0x1790 = 6032)
            const isProgramError = errJson.includes('InstructionError') ||
              errJson.includes('Custom') ||
              logs.includes('Error Code:') ||
              logs.includes('InvalidTicketReceipt') ||
              logs.includes('TicketAlreadyUsed') ||
              logs.includes('Unauthorized')

            if (isProgramError) {
              preFlightData = {
                targetWordPda,
                sessionPda,
                userProfilePda,
                teeRpc,
                alreadySent: false,
              }
            } else {
              // Unknown error - might be TEE issue
              console.error('❌ Pre-flight simulation failed with unexpected error:', simulationResult.value.err)
              console.error('📜 Simulation logs:', simulationResult.value.logs)
              throw new Error(
                `Game server is currently unavailable. Please try again later. (TEE simulation failed: ${errJson})`,
              )
            }
          } else {
            preFlightData = {
              targetWordPda,
              sessionPda,
              userProfilePda,
              teeRpc,
              alreadySent: false,
            }
          }
        } catch (preFlightErr: unknown) {
          const typedErr = preFlightErr as Error & { message?: string }
          console.error('Pre-flight check failed:', preFlightErr)

          if (typedErr?.message?.includes('Game server is currently unavailable')) {
            throw preFlightErr
          }
          throw new Error(
            'Unable to connect to game server. The server may be under maintenance. Please try again later.',
          )
        }
      } else {
        throw new Error('Session keypair not available. Please refresh the page and try again.')
      }

      // === Buy Ticket === \\
      const usdc_mint = address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

      // Derive ATA
      const [payerTokenAccount] = await findAssociatedTokenPda({
        owner: address(wallet.address),
        mint: usdc_mint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      // create buy ticket instruction
      const buyTicketIx = await getBuyTicketAndStartGameInstructionAsync({
        payer: createNoopSigner(address(wallet.address)),
        mint: usdc_mint,
        payerTokenAccount,
        periodId: trimmedPeriodId,
      })

      // get latest blockhash
      const { getLatestBlockhash } = createSolanaRpc('/api/rpc')
      const { value: latestBlockhash } = await getLatestBlockhash().send()

      // create transaction with memo first, then buy ticket
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(address(wallet.address), tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([buyTicketIx], tx),
        (tx) => compileTransaction(tx),
        (tx) => new Uint8Array(getTransactionEncoder().encode(tx)),
      )

      // Send the transaction
      const result = await signAndSendTransaction({
        transaction: transactionMessage,
        wallet: wallet,
      })

      // get signature
      const signature = getBase58Decoder().decode(result.signature)

      console.log('Buy ticket result:', signature)

      // Mark ticket purchase as complete (funds verified)
      setTicketPurchased(true)

      // === Send Reset Session on ER (rebuild with FRESH blockhash) === \\
      if (preFlightData && currentTempKeypair) {
        // Check if reset session was already sent during pre-flight
        if (preFlightData.alreadySent) {
          setVrfCompleted(true)
        } else {
          // Reset session not yet sent, send it now with retries
          const MAX_RETRIES = 3
          const RETRY_DELAY_MS = 2000

          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              const { value: freshBlockhash } = await preFlightData.teeRpc.getLatestBlockhash().send()

              // Rebuild reset session instruction with fresh data
              const resetSessionIx = getResetSessionInstruction({
                payer: currentTempKeypair.signer,
                session: preFlightData.sessionPda,
                targetWord: preFlightData.targetWordPda,
                userProfile: preFlightData.userProfilePda,
                periodId: trimmedPeriodId,
              })

              // Build transaction message with FRESH blockhash
              const resetTxMessage = pipe(
                createTransactionMessage({ version: 0 }),
                (tx) => setTransactionMessageFeePayerSigner(currentTempKeypair.signer, tx),
                (tx) => setTransactionMessageLifetimeUsingBlockhash(freshBlockhash, tx),
                (tx) => appendTransactionMessageInstructions([resetSessionIx], tx),
              )

              // Sign the fresh transaction
              const signedResetTx = await signTransactionMessageWithSigners(resetTxMessage)

              const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc: preFlightData.teeRpc })

              // Send the freshly signed transaction to magicblock
              await sendTransaction(signedResetTx, { commitment: 'confirmed' })

              const resetSignature = getSignatureFromTransaction(signedResetTx)

              setVrfCompleted(true)
              break
            } catch (erErr: unknown) {
              const typedErr = erErr as Error & {
                message?: string
                name?: string
                stack?: string
                getLogs?: () => Promise<string[]>
              }

              console.error(`Reset session attempt ${attempt} failed:`, typedErr?.message)

              if (attempt === MAX_RETRIES) {
                throw new Error(
                  'Ticket purchased but game session failed to initialize. ' +
                  'Please refresh the page or contact support.',
                )
              }

              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
            }
          }
        }
      }

      // Generate session ID for tracking
      const sessionId = `voble-${wallet.address}-${trimmedPeriodId}`

      setIsLoading(false)
      return {
        success: true,
        sessionId,
      }
    } catch (err: unknown) {
      const typedErr = err as Error & { message?: string; logs?: string[]; stack?: string }
      console.error('Buy ticket error:', typedErr?.message)

      let errorMessage = handleTransactionError(err)

      // Check for specific game-related errors
      if (typedErr?.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected'
      } else if (typedErr?.message?.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance (need 0.1 SOL + fees)'
      } else if (typedErr?.message?.includes('already exists')) {
        errorMessage = 'You already have an active game session for this period'
      }

      setError(errorMessage)
      setIsLoading(false)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  return {
    buyTicket,
    isLoading,
    error,
    ticketPurchased,
    vrfCompleted,
  }
}
