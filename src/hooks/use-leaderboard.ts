import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWallets } from '@privy-io/react-auth/solana'

import { getCurrentPeriodIds } from './pdas'

export type PeriodType = 'daily' | 'weekly' | 'monthly'

export interface LeaderboardRow {
  rank: number
  player: string
  username: string
  score: number
  guessesUsed: number
  timeMs: number
  timestamp: number
  gamesPlayed: number
}

export interface UseLeaderboardResult {
  entries: LeaderboardRow[]
  totalPlayers: number
  periodId: string
  prizePool: number
  userRank: number | null
  isLoading: boolean
  isFetching: boolean
  error: string | null
  refetch: () => void
}

export function useLeaderboard(periodType: PeriodType): UseLeaderboardResult {
  const { wallets } = useWallets()
  const selectedWallet = wallets[0]
  const { daily, weekly, monthly } = getCurrentPeriodIds()
  const periodId = periodType === 'daily' ? daily : periodType === 'weekly' ? weekly : monthly

  const queryResult = useQuery({
    queryKey: ['leaderboard', periodType, periodId],
    queryFn: async (): Promise<
      Omit<UseLeaderboardResult, 'isLoading' | 'isFetching' | 'error' | 'refetch' | 'userRank' | 'prizePool'>
    > => {
      const params = new URLSearchParams({
        period: periodType,
        period_id: periodId,
      })

      const response = await fetch(`/api/leaderboard?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leaderboard')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries: LeaderboardRow[] = (data.entries || []).map((e: any) => ({
        rank: e.rank,
        player: e.player,
        username: e.username || '',
        score: Number(e.score ?? 0),
        guessesUsed: Number(e.guessesUsed ?? 0),
        timeMs: Number(e.timeMs ?? 0),
        timestamp: 0, // Not used from database
        gamesPlayed: Number(e.gamesPlayed ?? 1),
      }))

      return {
        entries,
        totalPlayers: data.totalPlayers || entries.length,
        periodId: data.periodId || periodId,
      }
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 2,
  })

  const entries = queryResult.data?.entries ?? []

  const userRank = useMemo(() => {
    if (!selectedWallet?.address) return null
    const entry = entries.find((e) => e.player === selectedWallet.address)
    return entry ? entry.rank : null
  }, [entries, selectedWallet?.address])

  return {
    entries,
    totalPlayers: queryResult.data?.totalPlayers ?? 0,
    periodId: queryResult.data?.periodId ?? periodId,
    prizePool: 0, // Prize pool is fetched separately via useVaultBalances
    userRank,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error?.message ?? null,
    refetch: queryResult.refetch,
  }
}
