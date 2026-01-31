import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWallets } from '@privy-io/react-auth/solana'
import {
  pipe,
  createSolanaRpc,
  createTransactionMessage,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  address,
  signTransactionMessageWithSigners,
  sendTransactionWithoutConfirmingFactory,
  getSignatureFromTransaction,
  setTransactionMessageFeePayerSigner,
  getBase64EncodedWireTransaction,
} from '@solana/kit'

import { handleTransactionError } from './utils'

import { useTempKeypair } from '@/hooks/use-temp-keypair'
import { getLeaderboardPDA } from '@/hooks/pdas'
import { usePrivateRollupAuth } from '@/hooks/use-private-rollup-auth'

import { getCommitAndUpdateStatsInstructionAsync } from '@clients/js/src/generated'
import { getCurrentPeriodIds } from '@/lib/periods'

export interface CompleteGameResult {
  success: boolean
  signature?: string
  error?: string
  finalScore?: number
  leaderboardRank?: number
}

export function useCompleteGame() {
  const { wallets } = useWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tempKeypair = useTempKeypair()
  const { getToken } = usePrivateRollupAuth()
  const queryClient = useQueryClient()

  const wallet = wallets[0]

  const completeGame = async (periodId: string): Promise<CompleteGameResult> => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate inputs
      if (!wallet) {
        console.error('❌  No wallet connected')
        throw new Error('No wallet connected')
      }

      if (!wallet.address) {
        console.error('❌ Wallet not properly connected')
        throw new Error('Wallet not properly connected')
      }

      if (!periodId || periodId.trim().length === 0) {
        console.error('❌ Period ID is empty')
        throw new Error('Period ID is required')
      }

      // Use temp keypair as payer for gasless ER transaction
      if (!tempKeypair) {
        throw new Error('Temp keypair not available')
      }

      // get periodID args
      const { daily, weekly, monthly } = getCurrentPeriodIds()

      // get PDA for leaderboards using centralized functions
      const [dailyLeaderboardPda] = await getLeaderboardPDA(daily, 'daily')
      const [weeklyLeaderboardPda] = await getLeaderboardPDA(weekly, 'weekly')
      const [monthlyLeaderboardPda] = await getLeaderboardPDA(monthly, 'monthly')

      // Get auth token and initialize TEE connection
      const authToken = await getToken()
      if (!authToken) {
        throw new Error('Failed to authenticate with TEE')
      }
      const teeUrl = `https://tee.magicblock.app?token=${authToken}`
      const rpc = createSolanaRpc(teeUrl)

      // create commitAndUpdateStats instruction
      const commitAndUpdateStatsIx = await getCommitAndUpdateStatsInstructionAsync({
        payer: tempKeypair.signer,
        player: address(wallet.address),
        dailyLeaderboard: dailyLeaderboardPda,
        weeklyLeaderboard: weeklyLeaderboardPda,
        monthlyLeaderboard: monthlyLeaderboardPda,
        dailyPeriodId: daily,
        weeklyPeriodId: weekly,
        monthlyPeriodId: monthly,
      })

      // get latest blockhash
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

      // build transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(tempKeypair.signer, tx),
        (tx) => appendTransactionMessageInstructions([commitAndUpdateStatsIx], tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      )

      // sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      // === Simulate transaction first to get detailed error info ===
      console.log('🔍 Simulating complete game transaction...')
      try {
        const encodedTx = getBase64EncodedWireTransaction(signedTransaction)

        const simulationResult = await rpc
          .simulateTransaction(encodedTx as unknown as Parameters<typeof rpc.simulateTransaction>[0], {
            encoding: 'base64',
          })
          .send()

        console.log('📊 Simulation Result:', {
          err: simulationResult.value.err,
          logs: simulationResult.value.logs,
          unitsConsumed: simulationResult.value.unitsConsumed,
        })

        if (simulationResult.value.err) {
          console.error('❌ Simulation failed:', simulationResult.value.err)
          console.error('📜 Simulation logs:', simulationResult.value.logs)
          throw new Error(`Simulation failed: ${JSON.stringify(simulationResult.value.err)}`)
        }

        console.log('✅ Simulation succeeded, sending transaction...')
      } catch (simError) {
        console.error('❌ Simulation error:', simError)
        console.log('🔑 Accounts used:', {
          payer: tempKeypair.signer.address,
          player: wallet.address,
          dailyLeaderboard: dailyLeaderboardPda,
          weeklyLeaderboard: weeklyLeaderboardPda,
          monthlyLeaderboard: monthlyLeaderboardPda,
        })
        throw simError
      }

      // send transaction
      const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc })
      await sendTransaction(signedTransaction, { commitment: 'confirmed' })

      const signature = getSignatureFromTransaction(signedTransaction)

      // Invalidate profile cache to refresh stats
      await queryClient.invalidateQueries({
        queryKey: ['userProfile', wallet.address],
      })

      if (!signature) {
        throw new Error('Transaction failed')
      }

      setIsLoading(false)
      return {
        success: true,
        signature: signature,
      }
    } catch (err: unknown) {
      const typedErr = err as Error & { message?: string }
      console.error('❌ Error completing game:', err)

      let errorMessage = handleTransactionError(err)

      // Check for specific game completion errors
      if (typedErr?.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected'
      } else if (typedErr?.message?.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance for transaction fees'
      } else if (typedErr?.message?.includes('game already completed')) {
        errorMessage = 'Game has already been completed'
      } else if (typedErr?.message?.includes('game not started')) {
        errorMessage = 'No active game session found. Please buy a ticket first.'
      } else if (typedErr?.message?.includes('no guesses submitted')) {
        errorMessage = 'You must submit at least one guess before completing the game'
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
    completeGame,
    isLoading: isLoading,
    error,
  }
}
