import { useState } from 'react'
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana'
import { useQueryClient } from '@tanstack/react-query'
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
} from '@solana/kit'

import { getInitializeUserProfileInstructionAsync } from '@clients/js/src/generated'
import { handleTransactionError } from './utils'

import { getEventAuthorityPDA } from './pdas'
import { VOBLE_PROGRAM_ADDRESS } from '@clients/js/src/generated'

export interface InitializeProfileResult {
  success: boolean
  signature?: string
  error?: string
  profileAddress?: string
}

export function useInitializeProfile() {
  const { wallets } = useWallets()
  const { signAndSendTransaction } = useSignAndSendTransaction()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const wallet = wallets[0]

  const initializeProfile = async (username: string): Promise<InitializeProfileResult> => {
    setIsLoading(true)
    setError(null)

    try {
      if (!wallet) {
        console.error('❌ [useInitializeProfile] No wallet connected')
        throw new Error('No wallet connected')
      }

      if (!username || username.trim().length === 0) {
        console.error('❌ [useInitializeProfile] Username is empty')
        throw new Error('Username is required')
      }

      if (username.length > 32) {
        console.error('❌ [useInitializeProfile] Username too long:', username.length)
        throw new Error('Username must be 32 characters or less')
      }

      // remove whitespace from username
      const trimmedUsername = username.trim()

      // get latest blockhash
      const { getLatestBlockhash } = createSolanaRpc('/api/rpc')
      const { value: latestBlockhash } = await getLatestBlockhash().send()

      const [eventAuthorityPda] = await getEventAuthorityPDA()

      // ==== CREATE PROFILE === \\

      // build instruction
      const createProfileIx = await getInitializeUserProfileInstructionAsync({
        payer: createNoopSigner(address(wallet.address)),
        username: trimmedUsername,
        eventAuthority: address(eventAuthorityPda),
        program: address(VOBLE_PROGRAM_ADDRESS)
      })

      // create transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(address(wallet.address), tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([createProfileIx], tx),
        (tx) => compileTransaction(tx),
        (tx) => new Uint8Array(getTransactionEncoder().encode(tx)),
      )

      // Send the transaction
      const result = await signAndSendTransaction({
        transaction: transactionMessage,
        wallet: wallet,
      })

      // Check for referral code and record the referral relationship
      try {
        const referralCode = localStorage.getItem('referralCode')
        if (referralCode) {
          const response = await fetch('/api/referral/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refereeWallet: wallet.address,
              referralCode: referralCode,
            }),
          })

          if (response.ok) {
            localStorage.removeItem('referralCode') // Clear after use
          } else {
            console.warn('⚠️ Failed to record referral:', await response.text())
          }
        }
      } catch (referralErr) {
        console.warn('⚠️ Error recording referral:', referralErr)
        // Non-blocking - profile creation still succeeded
      }

      await queryClient.invalidateQueries({
        queryKey: ['userProfile', wallet.address],
      })

      setIsLoading(false)
      return {
        success: true,
      }
    } catch (err: unknown) {
      const typedErr = err as Error & { message?: string; logs?: string[] }
      console.error('❌ Error initializing profile:', err)
      let errorMessage = handleTransactionError(err)

      // Check for specific profile creation errors
      if (typedErr?.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected'
      } else if (typedErr?.message?.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance for profile creation'
      } else if (typedErr?.message?.includes('already exists') || typedErr?.message?.includes('already in use')) {
        errorMessage = 'User profile already exists for this wallet'
      } else if (typedErr?.message?.includes('invalid username')) {
        errorMessage = 'Invalid username provided'
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
    initializeProfile,
    isLoading,
    error,
  }
}
