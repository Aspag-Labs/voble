import { useQuery } from '@tanstack/react-query'
import { useWallets } from '@privy-io/react-auth/solana'
import { createSolanaRpc, address, type Address } from '@solana/kit'

import { getUserProfilePDA } from './pdas'
import { fetchMaybeUserProfile, type UserProfile } from '@clients/js/src/generated'

export interface UserProfileData {
  player: Address
  username: string
  totalGamesPlayed: number
  gamesWon: number

  totalScore: number
  bestScore: number

  // Prize winnings (from on-chain)
  totalPrizeWinnings: bigint
  totalLuckyDrawWinnings: bigint

  createdAt: bigint
  lastPlayed: bigint

  // Activity Points
  activityPoints: number

  // Ticket payment tracking (for recovery)
  lastPaidPeriod: string
}

export interface UserProfileResult {
  profile: UserProfileData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  exists: boolean
}

export function useUserProfile(walletAddress?: string): UserProfileResult {
  const { wallets } = useWallets()
  const selectedWallet = wallets[0]

  // Use provided address or connected wallet address
  const targetAddress = walletAddress || selectedWallet?.address

  const queryResult = useQuery({
    queryKey: ['userProfile', targetAddress],
    queryFn: async (): Promise<UserProfileData | null> => {
      if (!targetAddress) {
        throw new Error('No wallet address provided')
      }

      const playerAddress = address(targetAddress)

      // Derive the user profile PDA
      const [userProfilePda] = await getUserProfilePDA(playerAddress)

      try {
        // Fetch the user profile account using Solana Kit
        const rpc = createSolanaRpc('/api/rpc')
        const maybeProfile = await fetchMaybeUserProfile(rpc, userProfilePda)

        if (!maybeProfile.exists) {
          return null
        }

        const profileAccount = maybeProfile.data

        const profileData: UserProfileData = {
          player: profileAccount.player,
          username: profileAccount.username,
          totalGamesPlayed: profileAccount.totalGamesPlayed,
          gamesWon: profileAccount.gamesWon,

          totalScore: profileAccount.totalScore,
          bestScore: profileAccount.bestScore,

          // Prize winnings
          totalPrizeWinnings: profileAccount.totalPrizeWinnings,
          totalLuckyDrawWinnings: profileAccount.totalLuckyDrawWinnings,

          createdAt: profileAccount.createdAt,
          lastPlayed: profileAccount.lastPlayed,

          activityPoints: profileAccount.activityPoints,

          lastPaidPeriod: profileAccount.lastPaidPeriod,
        }

        return profileData
      } catch (err: unknown) {
        const error = err as Error & { message?: string }
        console.error('❌ [useUserProfile] Error fetching profile:', err)
        throw new Error(`Failed to fetch user profile: ${error.message}`)
      }
    },
    enabled: !!targetAddress,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry if account doesn't exist
      if (error.message?.includes('Account does not exist')) {
        return false
      }
      return failureCount < 3
    },
  })

  return {
    profile: queryResult.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch,
    exists: queryResult.data !== null,
  }
}

/**
 * Hook to get the current user's profile (connected wallet)
 */
export function useCurrentUserProfile(): UserProfileResult {
  const { wallets } = useWallets()
  const selectedWallet = wallets[0]

  return useUserProfile(selectedWallet?.address)
}

/**
 * Hook to check if a user profile exists without fetching full data
 */
export function useProfileExists(walletAddress: string): {
  exists: boolean
  isLoading: boolean
  error: string | null
} {
  const queryResult = useQuery({
    queryKey: ['profileExists', walletAddress],
    queryFn: async (): Promise<boolean> => {
      if (!walletAddress) {
        return false
      }

      const playerAddress = address(walletAddress)
      const [userProfilePda] = await getUserProfilePDA(playerAddress)

      try {
        const rpc = createSolanaRpc('/api/rpc')
        const maybeProfile = await fetchMaybeUserProfile(rpc, userProfilePda)
        return maybeProfile.exists
      } catch {
        return false
      }
    },
    enabled: !!walletAddress,
    staleTime: 60000, // Cache for 1 minute
    retry: false, // Don't retry for existence checks
  })

  return {
    exists: queryResult.data || false,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
  }
}
