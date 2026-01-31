import { useState } from 'react'
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana'
import { permissionPdaFromAccount } from '@magicblock-labs/ephemeral-rollups-kit'

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
  getInitializeSessionInstructionAsync,
  getDelegateSessionPermissionInstructionAsync,
  getCreateSessionPermissionInstructionAsync,
  getInitializeTargetWordInstructionAsync,
  getCreateTargetWordPermissionInstructionAsync,
  getDelegateTargetWordPermissionInstructionAsync,
  getDelegateSessionInstructionAsync,
  getDelegateTargetWordInstructionAsync,
} from '@clients/js/src/generated'

import {
  getSessionPDA,
  getDelegationBufferPDA,
  getDelegationRecordPDA,
  getDelegationMetadataPDA,
  getPermissionDelegationBufferPDA,
  getTargetWordPDA,
  PERMISSION_PROGRAM_ADDRESS,
  DELEGATION_PROGRAM_ADDRESS,
} from './pdas'

export interface InitializeSessionResult {
  success: boolean
  signature?: string
  error?: string
}

export function useInitializeSession() {
  const { wallets } = useWallets()
  const { signAndSendTransaction } = useSignAndSendTransaction()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wallet = wallets[0]

  const initializeSession = async (): Promise<InitializeSessionResult> => {
    try {
      setIsLoading(true)
      setError(null)

      if (!wallet) {
        throw new Error('No wallet connected')
      }

      const walletAddress = address(wallet.address)

      // TEE Validator for Private ER - required for privacy protection
      const TEE_VALIDATOR = address('FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA')

      // === TARGET WORD & SESSION SETUP === \\

      // 1. Target Word Account (Private TEE)
      const [targetWordPda] = await getTargetWordPDA(walletAddress)

      // Permission PDA for target word (SDK 0.8.0 - no group needed)
      const targetWordPermissionPda = await permissionPdaFromAccount(targetWordPda)

      // 2. Session Account (Readable by player)
      const [sessionPda] = await getSessionPDA(walletAddress)
      console.log('   Session PDA:', sessionPda)

      // Check if session and permission already exist
      const rpc = createSolanaRpc('/api/rpc')

      // Derive permission PDA using ephemeral-rollups-kit
      const permissionPda = await permissionPdaFromAccount(sessionPda)

      const [sessionAccountInfo, permissionAccountInfo, targetWordAccountInfo] = await Promise.all([
        rpc.getAccountInfo(sessionPda, { encoding: 'base64' }).send(),
        rpc.getAccountInfo(permissionPda, { encoding: 'base64' }).send(),
        rpc.getAccountInfo(targetWordPda, { encoding: 'base64' }).send(),
      ])
      const sessionExists = sessionAccountInfo.value !== null
      const permissionExists = permissionAccountInfo.value !== null
      const targetWordExists = targetWordAccountInfo.value !== null

      console.log('📊 [InitializeSession] Account Status:')
      console.log('   Session exists:', sessionExists)
      console.log('   Target Word exists:', targetWordExists)

      // Build instructions array based on what already exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instructions: any[] = []
      const instructionNames: string[] = []

      // === PHASE A: SESSION (must be created FIRST - TargetWord depends on it) ===

      // 1. Add initialize session if it doesn't exist
      if (!sessionExists) {
        const createSessionIx = await getInitializeSessionInstructionAsync({
          payer: createNoopSigner(walletAddress),
        })
        instructions.push(createSessionIx)
        instructionNames.push('InitializeSession')
      }

      // 2. Add create session permission if it doesn't exist
      if (!permissionExists) {
        // SDK 0.8.0: No group needed, permission is created directly
        console.log('   Creating session permission (SDK 0.8.0 - no group)')

        // Create session permission instruction (Private ER - player can read)
        const createPermissionIx = await getCreateSessionPermissionInstructionAsync({
          payer: createNoopSigner(walletAddress),
          player: createNoopSigner(walletAddress),
          session: sessionPda,
          permission: permissionPda,
          permissionProgram: PERMISSION_PROGRAM_ADDRESS,
        })
        instructions.push(createPermissionIx)
        instructionNames.push('CreateSessionPermission')
      }

      // === PHASE B: TARGET WORD (PRIVATE - requires Session to exist) ===

      if (!targetWordExists) {
        // 3. Initialize Target Word
        const initTargetWordIx = await getInitializeTargetWordInstructionAsync({
          payer: createNoopSigner(walletAddress),
          player: createNoopSigner(walletAddress),
        })
        instructions.push(initTargetWordIx)
        instructionNames.push('InitializeTargetWord')

        // 4. Create Permission (SDK 0.8.0 - no group needed)
        const createTargetPermissionIx = await getCreateTargetWordPermissionInstructionAsync({
          payer: createNoopSigner(walletAddress),
          player: createNoopSigner(walletAddress),
          targetWord: targetWordPda,
          permission: targetWordPermissionPda,
          permissionProgram: PERMISSION_PROGRAM_ADDRESS,
        })
        instructions.push(createTargetPermissionIx)
        instructionNames.push('CreateTargetWordPermission')
      }

      // === PHASE C: PERMISSION DELEGATION (for privacy on TEE) ===
      // IMPORTANT: Must happen BEFORE standard ER delegation!
      // Once the account is delegated (owned by DELEGATION program), we can't use it in DelegatePermissionCpiBuilder

      // 5. Delegate Target Word Permission to TEE (if new accounts were created)
      if (!targetWordExists) {
        const [targetDelegationRecord] = await getDelegationRecordPDA(targetWordPermissionPda)
        const [targetDelegationMetadata] = await getDelegationMetadataPDA(targetWordPermissionPda)
        const [targetBuffer] = await getPermissionDelegationBufferPDA(targetWordPermissionPda)

        const delegateTargetWordIx = await getDelegateTargetWordPermissionInstructionAsync({
          payer: createNoopSigner(walletAddress),
          player: createNoopSigner(walletAddress),
          targetWord: targetWordPda,
          permission: targetWordPermissionPda,
          permissionProgram: PERMISSION_PROGRAM_ADDRESS,
          ownerProgram: PERMISSION_PROGRAM_ADDRESS,
          delegationBuffer: targetBuffer,
          delegationRecord: targetDelegationRecord,
          delegationMetadata: targetDelegationMetadata,
          delegationProgram: DELEGATION_PROGRAM_ADDRESS,
          validator: TEE_VALIDATOR,
        })
        instructions.push(delegateTargetWordIx)
        instructionNames.push('DelegateTargetWordPermission (TEE)')
      }

      // 6. Delegate session permission
      const [bufferPda] = await getPermissionDelegationBufferPDA(permissionPda)
      const [delegationRecordPda] = await getDelegationRecordPDA(permissionPda)
      const [delegationMetadataPda] = await getDelegationMetadataPDA(permissionPda)

      console.log('   Buffer PDA:', bufferPda)
      console.log('   Delegation Record PDA:', delegationRecordPda)
      console.log('   Delegation Metadata PDA:', delegationMetadataPda)
      console.log('   TEE Validator:', TEE_VALIDATOR)

      const delegateIx = await getDelegateSessionPermissionInstructionAsync({
        payer: createNoopSigner(walletAddress),
        player: createNoopSigner(walletAddress),
        session: sessionPda,
        permission: permissionPda,
        permissionProgram: PERMISSION_PROGRAM_ADDRESS,
        ownerProgram: PERMISSION_PROGRAM_ADDRESS,
        delegationBuffer: bufferPda,
        delegationRecord: delegationRecordPda,
        delegationMetadata: delegationMetadataPda,
        delegationProgram: DELEGATION_PROGRAM_ADDRESS,
        validator: TEE_VALIDATOR,
      })
      instructions.push(delegateIx)
      instructionNames.push('DelegateSessionPermission (TEE)')

      // === PHASE D: STANDARD ER DELEGATION (for write access on TEE) ===
      // Must happen AFTER permission delegation (once account is delegated, it's owned by DELEGATION program)
      // NOTE: Must explicitly pass delegation PDAs derived from DELEGATION_PROGRAM (codama derives from VOBLE incorrectly)

      // 7. Delegate target word for write access (if new accounts were created)
      if (!targetWordExists) {
        // Explicitly derive delegation PDAs from DELEGATION_PROGRAM (not VOBLE)
        const [targetWordDelegationBuffer] = await getDelegationBufferPDA(targetWordPda)
        const [targetWordDelegationRecord] = await getDelegationRecordPDA(targetWordPda)
        const [targetWordDelegationMetadata] = await getDelegationMetadataPDA(targetWordPda)

        const delegateTargetWordErIx = await getDelegateTargetWordInstructionAsync({
          payer: createNoopSigner(walletAddress),
          player: walletAddress,
          targetWord: targetWordPda,
          bufferTargetWord: targetWordDelegationBuffer,
          delegationRecordTargetWord: targetWordDelegationRecord,
          delegationMetadataTargetWord: targetWordDelegationMetadata,
          validator: TEE_VALIDATOR,
        })
        instructions.push(delegateTargetWordErIx)
        instructionNames.push('DelegateTargetWord (ER Write Access)')
      }

      // 8. Delegate session for write access
      // Explicitly derive delegation PDAs from DELEGATION_PROGRAM (not VOBLE)
      const [sessionDelegationBuffer] = await getDelegationBufferPDA(sessionPda)
      const [sessionDelegationRecord] = await getDelegationRecordPDA(sessionPda)
      const [sessionDelegationMetadata] = await getDelegationMetadataPDA(sessionPda)

      const delegateSessionErIx = await getDelegateSessionInstructionAsync({
        payer: createNoopSigner(walletAddress),
        player: walletAddress,
        session: sessionPda,
        bufferSession: sessionDelegationBuffer,
        delegationRecordSession: sessionDelegationRecord,
        delegationMetadataSession: sessionDelegationMetadata,
        validator: TEE_VALIDATOR,
      })
      instructions.push(delegateSessionErIx)
      instructionNames.push('DelegateSession (ER Write Access)')

      console.log('📝 [InitializeSession] Instructions to execute:', instructionNames)

      // get latest blockhash
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

      // Build compiled transaction for simulation
      const compiledTx = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(walletAddress, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions(instructions, tx),
        (tx) => compileTransaction(tx),
      )

      // Encode the compiled transaction for signing (skip simulation for faster UX)
      const transactionMessage = new Uint8Array(getTransactionEncoder().encode(compiledTx))

      console.log('📦 [InitializeSession] Sending transaction...')

      // Send the transaction (same pattern as use-buy-ticket.ts)
      const result = await signAndSendTransaction({
        transaction: transactionMessage,
        wallet: wallet,
      })

      // Decode signature for logging
      const signature = getBase58Decoder().decode(result.signature)

      console.log('✅ [InitializeSession] Transaction sent:', signature)

      setIsLoading(false)
      return {
        success: true,
        signature: signature,
      }
    } catch (err: unknown) {
      console.error('❌ Initialize session Error:', err)

      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      setIsLoading(false)

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  return {
    initializeSession,
    isLoading,
    error,
  }
}
