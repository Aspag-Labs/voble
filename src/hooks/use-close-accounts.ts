'use client'

import { useState, useCallback } from 'react'
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana'
import { permissionPdaFromAccount } from '@magicblock-labs/ephemeral-rollups-kit'
import { toast } from 'sonner'

import {
    pipe,
    createTransactionMessage,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions,
    compileTransaction,
    createNoopSigner,
    createSolanaRpc,
    getTransactionEncoder,
    address,
    getBase58Decoder,
} from '@solana/kit'

import {
    getUndelegateSessionPermissionInstructionAsync,
    getCloseSessionPermissionInstructionAsync,
    getCloseTargetWordPermissionInstructionAsync,
} from '@clients/js/src/generated'

import {
    getSessionPDA,
    getTargetWordPDA,
    PERMISSION_PROGRAM_ADDRESS,
} from './pdas'

// Magic program addresses for undelegation
const MAGIC_PROGRAM = address('Magic11111111111111111111111111111111111111')
const MAGIC_CONTEXT = address('MagicContext1111111111111111111111111111111')

export interface CloseAccountsResult {
    success: boolean
    signature?: string
    error?: string
}

export function useCloseAccounts() {
    const { wallets } = useWallets()
    const { signAndSendTransaction } = useSignAndSendTransaction()
    const [isClosing, setIsClosing] = useState(false)
    const [isUndelegating, setIsUndelegating] = useState(false)

    const wallet = wallets[0]

    /**
     * Undelegate session from TEE back to base layer
     * This commits all state changes and removes delegation
     */
    const undelegateSession = useCallback(async (): Promise<CloseAccountsResult> => {
        if (!wallet) {
            return { success: false, error: 'No wallet connected' }
        }

        setIsUndelegating(true)

        try {
            const walletAddress = address(wallet.address)
            const rpc = createSolanaRpc('/api/rpc')

            // Derive PDAs
            const [sessionPda] = await getSessionPDA(walletAddress)
            const permissionPda = await permissionPdaFromAccount(sessionPda)

            console.log('📤 [UndelegateSession] Undelegating session...')
            console.log('   Session PDA:', sessionPda)
            console.log('   Permission PDA:', permissionPda)

            // Build undelegate instruction
            const undelegateIx = await getUndelegateSessionPermissionInstructionAsync({
                payer: createNoopSigner(walletAddress),
                player: walletAddress,
                session: sessionPda,
                permission: permissionPda,
                permissionProgram: PERMISSION_PROGRAM_ADDRESS,
                magicProgram: MAGIC_PROGRAM,
                magicContext: MAGIC_CONTEXT,
            })

            // Build and send transaction
            const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

            const compiledTx = pipe(
                createTransactionMessage({ version: 0 }),
                (tx) => setTransactionMessageFeePayer(walletAddress, tx),
                (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                (tx) => appendTransactionMessageInstructions([undelegateIx], tx),
                (tx) => compileTransaction(tx),
            )

            const transactionMessage = new Uint8Array(getTransactionEncoder().encode(compiledTx))

            const result = await signAndSendTransaction({
                transaction: transactionMessage,
                wallet: wallet,
            })

            const signature = getBase58Decoder().decode(result.signature)
            console.log('✅ [UndelegateSession] Success:', signature)
            toast.success('Session undelegated successfully')

            return { success: true, signature }
        } catch (err) {
            console.error('❌ [UndelegateSession] Error:', err)
            const errorMessage = err instanceof Error ? err.message : String(err)
            toast.error(`Failed to undelegate: ${errorMessage}`)
            return { success: false, error: errorMessage }
        } finally {
            setIsUndelegating(false)
        }
    }, [wallet, signAndSendTransaction])

    /**
     * Close session and target word permissions to reclaim SOL deposits
     * WARNING: This will require re-initialization to play again
     */
    const closePermissions = useCallback(async (): Promise<CloseAccountsResult> => {
        if (!wallet) {
            return { success: false, error: 'No wallet connected' }
        }

        setIsClosing(true)

        try {
            const walletAddress = address(wallet.address)
            const rpc = createSolanaRpc('/api/rpc')

            // Derive PDAs
            const [sessionPda] = await getSessionPDA(walletAddress)
            const [targetWordPda] = await getTargetWordPDA(walletAddress)
            const sessionPermissionPda = await permissionPdaFromAccount(sessionPda)
            const targetWordPermissionPda = await permissionPdaFromAccount(targetWordPda)

            console.log('🗑️ [ClosePermissions] Closing permissions...')
            console.log('   Session Permission:', sessionPermissionPda)
            console.log('   TargetWord Permission:', targetWordPermissionPda)

            // Build close instructions for both permissions
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const instructions: any[] = []

            // Close session permission
            const closeSessionIx = await getCloseSessionPermissionInstructionAsync({
                payer: createNoopSigner(walletAddress),
                player: createNoopSigner(walletAddress),
                session: sessionPda,
                permission: sessionPermissionPda,
                permissionProgram: PERMISSION_PROGRAM_ADDRESS,
            })
            instructions.push(closeSessionIx)

            // Close target word permission
            const closeTargetWordIx = await getCloseTargetWordPermissionInstructionAsync({
                payer: createNoopSigner(walletAddress),
                player: createNoopSigner(walletAddress),
                targetWord: targetWordPda,
                permission: targetWordPermissionPda,
                permissionProgram: PERMISSION_PROGRAM_ADDRESS,
            })
            instructions.push(closeTargetWordIx)

            // Build and send transaction
            const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

            const compiledTx = pipe(
                createTransactionMessage({ version: 0 }),
                (tx) => setTransactionMessageFeePayer(walletAddress, tx),
                (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                (tx) => appendTransactionMessageInstructions(instructions, tx),
                (tx) => compileTransaction(tx),
            )

            const transactionMessage = new Uint8Array(getTransactionEncoder().encode(compiledTx))

            const result = await signAndSendTransaction({
                transaction: transactionMessage,
                wallet: wallet,
            })

            const signature = getBase58Decoder().decode(result.signature)
            console.log('✅ [ClosePermissions] Success:', signature)
            toast.success('Permissions closed - SOL reclaimed!')

            return { success: true, signature }
        } catch (err) {
            console.error('❌ [ClosePermissions] Error:', err)
            const errorMessage = err instanceof Error ? err.message : String(err)
            toast.error(`Failed to close permissions: ${errorMessage}`)
            return { success: false, error: errorMessage }
        } finally {
            setIsClosing(false)
        }
    }, [wallet, signAndSendTransaction])

    return {
        undelegateSession,
        closePermissions,
        isUndelegating,
        isClosing,
    }
}
