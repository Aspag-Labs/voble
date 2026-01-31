import { useState, useCallback } from 'react'
import { useWallets } from '@privy-io/react-auth/solana'
import {
    pipe,
    createTransactionMessage,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions,
    signTransactionMessageWithSigners,
    sendTransactionWithoutConfirmingFactory,
    createSolanaRpc,
    getSignatureFromTransaction,
    address,
} from '@solana/kit'

import { getResetSessionInstruction } from '@clients/js/src/generated'

import { useTempKeypair } from '@/hooks/use-temp-keypair'
import { getTargetWordPDA, getSessionPDA, getUserProfilePDA } from '@/hooks/pdas'
import { usePrivateRollupAuth } from '@/hooks/use-private-rollup-auth'

export interface RecoverTicketResult {
    success: boolean
    signature?: string
    error?: string
}

/**
 * Hook to recover a paid ticket by retrying reset_session on TEE
 * Used when a user has paid for a ticket but reset_session failed
 */
export function useRecoverTicket() {
    const { wallets } = useWallets()
    const tempKeypair = useTempKeypair()
    const { getToken } = usePrivateRollupAuth()
    const [isRecovering, setIsRecovering] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const wallet = wallets[0]

    const recoverTicket = useCallback(async (periodId: string): Promise<RecoverTicketResult> => {
        setIsRecovering(true)
        setError(null)

        const currentTempKeypair = tempKeypair

        try {
            if (!wallet) {
                throw new Error('No wallet connected')
            }

            if (!currentTempKeypair) {
                throw new Error('Session keypair not available. Please refresh the page.')
            }

            const trimmedPeriodId = periodId.trim()

            console.log('🔄 [useRecoverTicket] Starting ticket recovery for period:', trimmedPeriodId)

            // Derive PDAs
            const [targetWordPda] = await getTargetWordPDA(address(wallet.address))
            const [sessionPda] = await getSessionPDA(address(wallet.address))
            const [userProfilePda] = await getUserProfilePDA(address(wallet.address))

            // Get auth token for TEE connection
            const authToken = await getToken()
            if (!authToken) {
                throw new Error('Failed to authenticate with TEE')
            }

            // Initialize TEE connection
            const teeUrl = `https://tee.magicblock.app?token=${authToken}`
            const teeRpc = createSolanaRpc(teeUrl)

            const MAX_RETRIES = 5
            const RETRY_DELAY_MS = 3000

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    console.log(`🔄 [useRecoverTicket] Attempt ${attempt}/${MAX_RETRIES}...`)

                    // Get fresh blockhash
                    const { value: freshBlockhash } = await teeRpc.getLatestBlockhash().send()

                    // Build reset session instruction
                    const resetSessionIx = getResetSessionInstruction({
                        payer: currentTempKeypair.signer,
                        session: sessionPda,
                        targetWord: targetWordPda,
                        userProfile: userProfilePda,
                        periodId: trimmedPeriodId,
                    })

                    // Build transaction
                    const resetTxMessage = pipe(
                        createTransactionMessage({ version: 0 }),
                        (tx) => setTransactionMessageFeePayerSigner(currentTempKeypair.signer, tx),
                        (tx) => setTransactionMessageLifetimeUsingBlockhash(freshBlockhash, tx),
                        (tx) => appendTransactionMessageInstructions([resetSessionIx], tx),
                    )

                    // Sign and send
                    const signedResetTx = await signTransactionMessageWithSigners(resetTxMessage)
                    const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc: teeRpc })
                    await sendTransaction(signedResetTx, { commitment: 'confirmed' })

                    const resetSignature = getSignatureFromTransaction(signedResetTx)

                    console.log('✅ [useRecoverTicket] Recovery successful:', resetSignature)

                    setIsRecovering(false)
                    return {
                        success: true,
                        signature: resetSignature,
                    }
                } catch (retryErr: unknown) {
                    const typedErr = retryErr as Error & { message?: string }
                    console.error(`⚠️ [useRecoverTicket] Attempt ${attempt} failed:`, typedErr.message)

                    // Check if this is a "TicketAlreadyUsed" error - means recovery already happened
                    if (typedErr.message?.includes('TicketAlreadyUsed') || typedErr.message?.includes('6032')) {
                        console.log('✅ [useRecoverTicket] Ticket already used - session was already reset')
                        setIsRecovering(false)
                        return {
                            success: true,
                            signature: 'already-recovered',
                        }
                    }

                    if (attempt === MAX_RETRIES) {
                        throw new Error(`Recovery failed after ${MAX_RETRIES} attempts. Please try again later.`)
                    }

                    console.log(`⏳ Waiting ${RETRY_DELAY_MS}ms before retry...`)
                    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
                }
            }

            throw new Error('Unexpected error during recovery')
        } catch (err: unknown) {
            const typedErr = err as Error & { message?: string }
            console.error('❌ [useRecoverTicket] Error:', typedErr.message)
            setError(typedErr.message || 'Unknown error')
            setIsRecovering(false)
            return {
                success: false,
                error: typedErr.message,
            }
        }
    }, [wallet, tempKeypair, getToken])

    return {
        recoverTicket,
        isRecovering,
        error,
    }
}
