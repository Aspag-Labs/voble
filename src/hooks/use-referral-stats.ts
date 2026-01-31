import { useQuery } from '@tanstack/react-query'
import { useWallets } from '@privy-io/react-auth/solana'

export interface ReferralStats {
  code: string | null
  referralLink: string | null
  referralCount: number
  claimableAmount: number
  lifetimeEarnings: number
  lastClaimedAt: string | null
  recentEarnings: Array<{
    referee_wallet: string
    referral_commission: number
    created_at: string
  }>
}

/**
 * Hook to fetch referral stats for the current user.
 * The API automatically generates a referral code if one doesn't exist.
 */
export function useReferralStats() {
  const { wallets } = useWallets()
  const wallet = wallets[0]

  const query = useQuery<ReferralStats>({
    queryKey: ['referralStats', wallet?.address],
    queryFn: async () => {
      if (!wallet?.address) {
        throw new Error('No wallet connected')
      }

      const response = await fetch(`/api/referral/stats?wallet=${wallet.address}`)

      if (!response.ok) {
        throw new Error('Failed to fetch referral stats')
      }

      return response.json()
    },
    enabled: !!wallet?.address,
    staleTime: 30000,
    refetchInterval: 60000,
  })

  return query
}

export function useGenerateReferralCode() {
  const { wallets } = useWallets()
  const wallet = wallets[0]

  const generateCode = async () => {
    if (!wallet?.address) {
      throw new Error('No wallet connected')
    }

    const response = await fetch('/api/referral/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: wallet.address }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to generate referral code')
    }

    return response.json()
  }

  return { generateCode }
}
