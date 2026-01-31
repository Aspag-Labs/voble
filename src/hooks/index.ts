/**
 * Solana Kit Hooks for Voble Game
 *
 * Fully migrated to @solana/kit for modern, type-safe Solana interactions
 */

// Core utilities
export * from './utils'
export * from './pdas'

// Transaction hooks (write operations)
export { useInitializeProfile } from './use-initialize-profile'
export { useBuyTicket } from './use-buy-ticket'
export { useSubmitGuess } from './use-submit-guess'
export { useCompleteGame } from './use-complete-game'

export { useClaim } from './use-claim'
export { useTradeActivityPoints } from './use-trade-points'
export { useCloseAccounts } from './use-close-accounts'
export { useRecoverTicket } from './use-recover-ticket'

// Data fetching hooks (read operations)
export { useFetchSession } from './use-fetch-session'
export { useUserProfile, useCurrentUserProfile, useProfileExists } from './use-user-profile'
export { useVaultBalances, useVaultBalance, useTotalPrizePool } from './use-vault-balances'
export { useLeaderboard } from './use-leaderboard'

// Re-export types for convenience
export type { InitializeProfileResult } from './use-initialize-profile'

export type { BuyTicketResult } from './use-buy-ticket'

export type { SubmitGuessResult } from './use-submit-guess'

export type { CompleteGameResult } from './use-complete-game'

export type { SessionData, FetchSessionResult } from './use-fetch-session'

export { LetterResult } from './use-fetch-session'

export type { UserProfileData, UserProfileResult } from './use-user-profile'

export type { VaultBalance, VaultBalances, VaultBalancesResult } from './use-vault-balances'

export type { ClaimResult, PrizePeriodType, UnclaimedPrize, UnclaimedRaffle } from './use-claim'

export type { UseLeaderboardResult, LeaderboardRow } from './use-leaderboard'
