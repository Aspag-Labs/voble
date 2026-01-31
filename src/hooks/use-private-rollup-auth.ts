import { getAuthToken, verifyTeeRpcIntegrity } from '@magicblock-labs/ephemeral-rollups-kit'
import { useWallets } from '@privy-io/react-auth/solana'
import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { address, type Address } from '@solana/kit'
import { toast } from 'sonner'

// TEE RPC URL for private ephemeral rollups
const TEE_RPC_URL = 'https://tee.magicblock.app'

const TOKENS_STORAGE_KEY = 'private-rollup-auth-tokens'
const TOKENS_CHANGE_EVENT = 'private-rollup-auth-tokens-changed'

// Generate a unique instance ID for debugging
let instanceCounter = 0

type AuthTokenData = { token: string; expiresAt: number }

export function usePrivateRollupAuth() {
  const instanceId = useRef(++instanceCounter)
  const { wallets } = useWallets()
  const wallet = wallets[0]
  const [tokens, setTokensState] = useState<Record<string, AuthTokenData>>({})
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const isMountedRef = useRef(true)

  // Get current token if valid
  const authToken = useMemo(() => {
    const pk = wallet?.address
    if (pk) {
      const tokenData = tokens[pk] ?? null
      if (tokenData?.expiresAt > Date.now()) {
        return tokenData.token
      }
    }
    return null
  }, [tokens, wallet])

  // Track component lifecycle
  useEffect(() => {
    isMountedRef.current = true

    // Listen for custom token change events to sync across instances
    const handleTokenChange = (e: CustomEvent) => {
      if (isMountedRef.current && e.detail && typeof e.detail === 'object') {
        setTokensState(e.detail)
      }
    }

    window.addEventListener(TOKENS_CHANGE_EVENT, handleTokenChange as EventListener)

    return () => {
      isMountedRef.current = false
      window.removeEventListener(TOKENS_CHANGE_EVENT, handleTokenChange as EventListener)
    }
  }, [])

  // Load tokens from localStorage whenever state is empty
  useEffect(() => {
    if (Object.keys(tokens).length === 0) {
      try {
        const storedTokens = localStorage.getItem(TOKENS_STORAGE_KEY)
        if (storedTokens) {
          const parsedTokens = JSON.parse(storedTokens)
          setTokensState(parsedTokens)
        }
      } catch (error) {
        console.error(`[Instance ${instanceId.current}] Error loading tokens from localStorage:`, error)
      }
    }
  }, [tokens])

  // Save tokens to localStorage whenever they change
  const setTokens = useCallback(
    (
      newTokens:
        | Record<string, AuthTokenData>
        | ((prev: Record<string, AuthTokenData>) => Record<string, AuthTokenData>),
    ) => {
      if (!isMountedRef.current) {
        return
      }
      setTokensState((prevTokens) => {
        const updatedTokens = typeof newTokens === 'function' ? newTokens(prevTokens) : newTokens
        try {
          localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(updatedTokens))

          // Dispatch custom event to notify other instances
          const event = new CustomEvent(TOKENS_CHANGE_EVENT, { detail: updatedTokens })
          window.dispatchEvent(event)
        } catch (error) {
          console.error(`[Instance ${instanceId.current}] Error saving tokens to localStorage:`, error)
        }
        return updatedTokens
      })
    },
    [],
  )

  const getToken = useCallback(async () => {
    if (!wallet || !wallet.signMessage) {
      console.warn('[usePrivateRollupAuth] No wallet or signMessage not available')
      return null
    }

    // Return cached token if valid
    if (authToken) {
      return authToken
    }

    setIsAuthenticating(true)

    try {
      const publicKey = address(wallet.address)

      // Step 1: Verify TEE RPC integrity per SDK 0.8.0 docs
      const isVerified = await verifyTeeRpcIntegrity(TEE_RPC_URL)
      if (!isVerified) {
        console.error('[usePrivateRollupAuth] TEE RPC integrity verification failed')
        toast.error('TEE RPC integrity verification failed')
        return null
      }
      console.log('[usePrivateRollupAuth] TEE RPC integrity verified ✅')

      const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
        const result = await wallet.signMessage({ message })

        if (result && typeof result === 'object' && 'signature' in result) {
          return result.signature as Uint8Array
        }

        return result as unknown as Uint8Array
      }

      // Step 2: Use SDK's getAuthToken which handles the full TEE challenge-response flow
      const { token, expiresAt } = await getAuthToken(TEE_RPC_URL, publicKey, signMessage)

      setTokens((oldTokens) => ({
        ...oldTokens,
        [wallet.address]: { token, expiresAt },
      }))

      toast.success(`Authenticated with TEE successfully`)
      return token
    } catch (error) {
      console.error('[usePrivateRollupAuth] Error getting token:', error)
      toast.error('Failed to authenticate with TEE')
      return null
    } finally {
      setIsAuthenticating(false)
    }
  }, [wallet, authToken, setTokens])

  // Clear token for current wallet (called when auth fails persistently)
  const clearToken = useCallback(() => {
    if (!wallet?.address) return

    console.log('[usePrivateRollupAuth] Clearing stale token due to persistent auth failure')
    setTokens((oldTokens) => {
      const newTokens = { ...oldTokens }
      delete newTokens[wallet.address]
      return newTokens
    })
  }, [wallet, setTokens])

  return { authToken, isAuthenticating, tokens, getToken, clearToken }
}
