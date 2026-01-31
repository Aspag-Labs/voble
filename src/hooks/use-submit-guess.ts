import { useWallets } from '@privy-io/react-auth/solana'
import {
  pipe,
  createSolanaRpc,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  appendTransactionMessageInstructions,
  address,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  sendTransactionWithoutConfirmingFactory,
  getSignatureFromTransaction,
} from '@solana/kit'

import { useTempKeypair } from '@/hooks/use-temp-keypair'
import { getSessionPDA, getTargetWordPDA, getEventAuthorityPDA } from '@/hooks/pdas'
import { usePrivateRollupAuth } from '@/hooks/use-private-rollup-auth'
import { getSubmitGuessInstructionAsync, VOBLE_PROGRAM_ADDRESS } from '@clients/js/src/generated'

export interface SubmitGuessResult {
  success: boolean
  signature?: string
  error?: string
}

export function useSubmitGuess() {
  const { wallets } = useWallets()
  const tempKeypair = useTempKeypair()
  const { getToken } = usePrivateRollupAuth()
  const selectedWallet = wallets[0]

  const submitGuess = async (guess: string, periodId?: string): Promise<SubmitGuessResult> => {
    try {
      if (!selectedWallet) {
        throw new Error('No wallet connected')
      }

      if (!guess || guess.length === 0) {
        throw new Error('Guess is required')
      }

      if (!tempKeypair) {
        throw new Error('Temp keypair not available')
      }

      // Derive PDAs
      const [sessionPda] = await getSessionPDA(address(selectedWallet.address))
      const [targetWordPda] = await getTargetWordPDA(address(selectedWallet.address))
      const [eventAuthorityPda] = await getEventAuthorityPDA()

      // Get auth token and initialize TEE connection
      const authToken = await getToken()
      if (!authToken) {
        throw new Error('Failed to authenticate with TEE')
      }
      const teeUrl = `https://tee.magicblock.app?token=${authToken}`
      const rpc = createSolanaRpc(teeUrl)

      // === FRONTEND GUARD: Validate period before submitting ===
      // The blockchain also validates this, but we check early to prevent unnecessary tx
      if (periodId) {
        try {
          const { fetchMaybeSessionAccount } = await import('@clients/js/src/generated')
          const maybeSession = await fetchMaybeSessionAccount(rpc, sessionPda)

          if (maybeSession.exists) {
            // Decode periodId from session
            const sessionPeriodBytes = maybeSession.data.periodId as Uint8Array
            let end = sessionPeriodBytes.length
            for (let i = 0; i < sessionPeriodBytes.length; i++) {
              if (sessionPeriodBytes[i] === 0) {
                end = i
                break
              }
            }
            const sessionPeriodId = new TextDecoder().decode(sessionPeriodBytes.slice(0, end))

            if (sessionPeriodId !== periodId.trim()) {
              console.error('❌ [useSubmitGuess] Period mismatch:', { sessionPeriodId, requestedPeriodId: periodId })
              throw new Error('Session period does not match. Please refresh and try again.')
            }
          }
        } catch (validationErr) {
          // If it's our mismatch error, rethrow it
          if ((validationErr as Error).message?.includes('period')) {
            throw validationErr
          }
          // Otherwise log and continue - blockchain will validate
          console.warn('⚠️ [useSubmitGuess] Could not validate period, continuing...', validationErr)
        }
      }

      // Create instruction (async version auto-resolves eventAuthority PDA if not provided)
      const submitGuessIx = await getSubmitGuessInstructionAsync({
        session: sessionPda,
        targetWord: targetWordPda,
        eventAuthority: eventAuthorityPda,
        program: VOBLE_PROGRAM_ADDRESS,
        guess: guess.toUpperCase(),
      })

      // get latest blockhash
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

      // build transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(tempKeypair.signer, tx),
        (tx) => appendTransactionMessageInstructions([submitGuessIx], tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      )

      // sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      // send transaction (skip simulation for faster feedback - TEE validates anyway)
      const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc })
      await sendTransaction(signedTransaction, { commitment: 'confirmed' })

      const signature = getSignatureFromTransaction(signedTransaction)

      return {
        success: true,
        signature,
      }
    } catch (err: unknown) {
      const error = err as Error
      console.warn('⚠️ Failed to submit guess:', error.message)

      return {
        success: false,
        error: error.message || 'Transaction failed',
      }
    }
  }

  return {
    submitGuess,
    isLoading: false,
  }
}
