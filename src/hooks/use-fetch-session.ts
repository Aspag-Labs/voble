import { useQuery, QueryObserverResult } from '@tanstack/react-query'
import { useWallets } from '@privy-io/react-auth/solana'
import { createSolanaRpc, address, type Address, type Option, type ReadonlyUint8Array } from '@solana/kit'
import { usePrivateRollupAuth } from './use-private-rollup-auth'

import { getSessionPDA } from './pdas'
import { fetchMaybeSessionAccount, type SessionAccount, type GuessData, LetterResult } from '@clients/js/src/generated'

export { LetterResult }

export interface GuessDataParsed {
  guess: string
  result: LetterResult[]
  timestamp: number
}

export interface SessionData {
  player: Address
  targetWord: string
  guesses: (GuessDataParsed | null)[]
  isSolved: boolean
  guessesUsed: number
  timeMs: number
  score: number
  completed: boolean
  periodId: string
  vrfRequestTimestamp: number
  isCurrentPeriod: boolean
}

export interface FetchSessionResult {
  session: SessionData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<QueryObserverResult<SessionData | null, Error>>
}

// ER RPC endpoint (regular)
const ER_RPC_URL = 'https://tee.magicblock.app'

// Track consecutive auth failures for retry logic
let consecutiveAuthFailures = 0
const MAX_AUTH_FAILURES_BEFORE_CLEAR = 2

export function useFetchSession(periodId: string): FetchSessionResult {
  const { wallets } = useWallets()
  const selectedWallet = wallets[0]
  const { authToken, getToken, clearToken } = usePrivateRollupAuth()

  const queryResult = useQuery({
    queryKey: ['gameSession', selectedWallet?.address, periodId],
    queryFn: async (): Promise<SessionData | null> => {
      if (!selectedWallet?.address) {
        throw new Error('No wallet connected')
      }

      if (!periodId || periodId.trim().length === 0) {
        throw new Error('Period ID is required')
      }

      const playerAddress = address(selectedWallet.address)
      const trimmedPeriodId = periodId.trim()

      // Derive the session PDA
      const [sessionPda] = await getSessionPDA(playerAddress)

      try {
        // Try ER first (during active gameplay)
        // With Private ER, session is readable by player (added as member)
        let sessionAccount: SessionAccount | null = null

        try {
          // Get token if not already cached
          const token = authToken || (await getToken())

          if (token) {
            // Pass token as query parameter per SDK docs
            const rpcUrl = `${ER_RPC_URL}?token=${token}`
            const erRpc = createSolanaRpc(rpcUrl)

            const maybeSession = await fetchMaybeSessionAccount(erRpc, sessionPda)
            if (maybeSession.exists) {
              sessionAccount = maybeSession.data
              // Reset failure counter on success
              consecutiveAuthFailures = 0
            }
          }
        } catch (err) {
          const errMessage = err instanceof Error ? err.message : String(err)

          // Check for CORS or network errors (likely stale token)
          const isCorsOrNetworkError =
            errMessage.includes('CORS') ||
            errMessage.includes('ERR_FAILED') ||
            errMessage.includes('NetworkError') ||
            errMessage.includes('Failed to fetch')

          if (isCorsOrNetworkError) {
            consecutiveAuthFailures++
            console.warn(
              `[useFetchSession] Auth failure #${consecutiveAuthFailures}/${MAX_AUTH_FAILURES_BEFORE_CLEAR}:`,
              errMessage,
            )

            // After multiple failures, clear token and force re-auth
            if (consecutiveAuthFailures >= MAX_AUTH_FAILURES_BEFORE_CLEAR) {
              console.warn('[useFetchSession] Max auth failures reached, clearing stale token for re-authentication')
              clearToken()
              consecutiveAuthFailures = 0
              // Don't throw - let it fall back to base layer, next query will trigger fresh auth
            }
          }

          // If it's a decode error, don't fall back to base layer
          if (errMessage.includes('decode') || errMessage.includes('Failed to decode')) {
            console.error('🔴 [useFetchSession] ER decode error - session exists but cannot be decoded:', err)
            throw new Error(`Session account exists on ER but cannot be decoded. This may indicate an IDL mismatch.`)
          }
        }

        // Session is ONLY on TEE - do NOT fall back to base layer
        // This is by design: sessions are delegated to TEE for gameplay

        if (!sessionAccount) {
          return null
        }

        // Helper to decode byte array to string (removes null bytes)
        const bytesToString = (bytes: Uint8Array | ReadonlyUint8Array): string => {
          // Find first null byte to trim padding
          let end = bytes.length
          for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] === 0) {
              end = i
              break
            }
          }
          return new TextDecoder().decode(bytes.slice(0, end))
        }

        // Transform guesses from Option<GuessData> to GuessDataParsed | null
        const parsedGuesses = sessionAccount.guesses.map((guess: Option<GuessData>) => {
          if (guess.__option === 'None' || !guess.value) return null
          const g = guess.value
          return {
            guess: g.guess,
            result: g.result,
            timestamp: 0, // Not stored in the account anymore, default to 0
          }
        })

        // Decode byte arrays to strings
        // Target word is revealed when game completes (stored in revealedTargetWord field)
        const revealedWord = bytesToString(sessionAccount.revealedTargetWord as Uint8Array)
        const targetWord = sessionAccount.completed ? revealedWord : ''
        const periodIdDecoded = bytesToString(sessionAccount.periodId as Uint8Array)

        // Check for period mismatch
        if (periodIdDecoded && periodIdDecoded !== trimmedPeriodId) {
          console.warn('⚠️ [useFetchSession] Period mismatch detected:', {
            sessionPeriodId: periodIdDecoded,
            requestedPeriodId: trimmedPeriodId,
            isCurrentPeriod: false,
          })
        }

        // Transform the raw account data to our interface
        const sessionData: SessionData = {
          player: sessionAccount.player,
          targetWord,
          guesses: parsedGuesses,
          isSolved: sessionAccount.isSolved,
          guessesUsed: sessionAccount.guessesUsed,
          timeMs: sessionAccount.timeMs, // Already number (u32)
          score: sessionAccount.score,
          completed: sessionAccount.completed,
          periodId: periodIdDecoded,
          isCurrentPeriod: periodIdDecoded === trimmedPeriodId,
          vrfRequestTimestamp: Number(sessionAccount.vrfRequestTimestamp),
        }

        return sessionData
      } catch (err: unknown) {
        const typedErr = err as Error & { message?: string }
        console.error('❌ [useFetchSession] Error fetching session:', err)
        throw new Error(`Failed to fetch session: ${typedErr.message}`)
      }
    },
    enabled: !!selectedWallet?.address && !!periodId,
    staleTime: 1000,
    refetchInterval: false,
    retry: (failureCount, error) => {
      // Don't retry if account doesn't exist
      if (error.message?.includes('Account does not exist')) {
        return false
      }
      return failureCount < 3
    },
  })

  return {
    session: queryResult.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch,
  }
}
