import { useQuery } from '@tanstack/react-query'
import { useWallets } from '@privy-io/react-auth/solana'

export interface PlayerRank {
  rank: number | null
  totalPlayers: number
  percentile: number | null
}

export function usePlayerRank() {
  const { wallets } = useWallets()
  const wallet = wallets[0]

  return useQuery<PlayerRank>({
    queryKey: ['playerRank', wallet?.address],
    queryFn: async () => {
      if (!wallet?.address) {
        throw new Error('No wallet connected')
      }

      const response = await fetch(`/api/player/rank?player=${wallet.address}`)

      if (!response.ok) {
        throw new Error('Failed to fetch player rank')
      }

      return response.json()
    },
    enabled: !!wallet?.address,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  })
}
