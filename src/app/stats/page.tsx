'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createSolanaRpc } from '@solana/kit'
import { Skeleton } from '@/components/ui/skeleton'
import { useVaultBalances } from '@/hooks'
import { getGlobalConfigPDA } from '@/hooks/pdas'
import { fetchMaybeGlobalConfig } from '@clients/js/src/generated'
import { cn } from '@/lib/utils'

import { Users, Vault, Trophy, Gift, TrendingUp, Award } from 'lucide-react'

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

const formatUSDC = (amount: number, digits = 2) => `$${amount.toFixed(digits)}`

const formatAddress = (address: string) => {
  if (!address || address.length <= 8) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export default function StatsPage() {
  const vaults = useVaultBalances()

  // Fetch player count from database (still needed since it's not stored in GlobalConfig)
  const playerCountQuery = useQuery({
    queryKey: ['player-count'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()
        return data.totalPlayers || 0
      } catch (error) {
        console.error('Failed to fetch player count:', error)
        return 0
      }
    },
    staleTime: 60_000,
  })

  // Fetch prize totals from on-chain GlobalConfig
  const globalConfigQuery = useQuery({
    queryKey: ['global-config-stats'],
    queryFn: async () => {
      const rpc = createSolanaRpc('/api/rpc')
      const [globalConfigPda] = await getGlobalConfigPDA()
      const maybeAccount = await fetchMaybeGlobalConfig(rpc, globalConfigPda)

      if (!maybeAccount.exists) {
        return { totalLeaderboardPrizesClaimed: 0n, totalLuckyDrawPrizesClaimed: 0n }
      }

      return {
        totalLeaderboardPrizesClaimed: maybeAccount.data.totalLeaderboardPrizesClaimed,
        totalLuckyDrawPrizesClaimed: maybeAccount.data.totalLuckyDrawPrizesClaimed,
      }
    },
    staleTime: 60_000,
  })

  const prizeTotals = vaults.balances
    ? vaults.balances.daily.balance + vaults.balances.weekly.balance + vaults.balances.monthly.balance
    : 0

  const luckyDrawBalance = vaults.balances?.luckyDraw.balance ?? 0

  // Calculate totals from on-chain data (convert from lamports to USDC)
  const totalLeaderboardClaimedUSDC = useMemo(() => {
    if (!globalConfigQuery.data) return 0
    return Number(globalConfigQuery.data.totalLeaderboardPrizesClaimed) / 1_000_000
  }, [globalConfigQuery.data])

  const totalLuckyDrawClaimedUSDC = useMemo(() => {
    if (!globalConfigQuery.data) return 0
    return Number(globalConfigQuery.data.totalLuckyDrawPrizesClaimed) / 1_000_000
  }, [globalConfigQuery.data])

  const totalPrizeClaimedUSDC = totalLeaderboardClaimedUSDC + totalLuckyDrawClaimedUSDC

  // Top Earners (fetched from indexer via API)
  const topEarnersQuery = useQuery({
    queryKey: ['top-earners'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/stats/top-earners')
        if (!response.ok) throw new Error('Failed to fetch top earners')
        return (await response.json()) as { player: string; username: string; totalEarned: number }[]
      } catch (error) {
        console.error('Failed to fetch top earners:', error)
        return []
      }
    },
    staleTime: 60_000,
  })

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white dark:bg-[#0f0f10] border-b border-zinc-200 dark:border-zinc-800">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="container mx-auto px-4 py-10 max-w-5xl relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">
            Protocol Dashboard
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">Live metrics from the Voble protocol on Solana.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Players */}
          <div className="bg-white dark:bg-[#0f0f10] rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Players</p>
              {playerCountQuery.isLoading ? (
                <Skeleton className="h-7 w-20 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {formatNumber(playerCountQuery.data ?? 0)}
                </p>
              )}
            </div>
          </div>

          {/* Active Prize Pool */}
          <div className="bg-white dark:bg-[#0f0f10] rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Vault className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Active Prize Pool</p>
              {vaults.isLoading ? (
                <Skeleton className="h-7 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {formatUSDC(prizeTotals)} <span className="text-sm font-normal text-zinc-500">USDC</span>
                </p>
              )}
            </div>
          </div>

          {/* Total Prize Claimed */}
          <div className="bg-white dark:bg-[#0f0f10] rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Prize Claimed</p>
              {globalConfigQuery.isLoading ? (
                <Skeleton className="h-7 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {formatUSDC(totalPrizeClaimedUSDC)} <span className="text-sm font-normal text-zinc-500">USDC</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Prize Breakdown & Raffle */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prize Pool Breakdown */}
          <div className="bg-white dark:bg-[#0f0f10] rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-zinc-500" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Prize Pool Breakdown</h2>
            </div>
            <div className="space-y-4">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <div key={period} className="flex justify-between items-center">
                  <span className="capitalize text-zinc-600 dark:text-zinc-400">{period}</span>
                  {vaults.isLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    <span className="text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
                      {formatUSDC(vaults.balances?.[period].balance ?? 0)}
                    </span>
                  )}
                </div>
              ))}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <span className="font-medium text-zinc-900 dark:text-white">Total Active</span>
                {vaults.isLoading ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <span className="text-xl font-bold text-zinc-900 dark:text-white tabular-nums">
                    {formatUSDC(prizeTotals)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Raffle / Lucky Draw Stats */}
          <div className="bg-white dark:bg-[#0f0f10] rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Gift className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Lucky Draw</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Current Jackpot</span>
                {vaults.isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <span className="text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
                    {formatUSDC(luckyDrawBalance)}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Total Raffles Claimed</span>
                {globalConfigQuery.isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <span className="text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
                    {formatUSDC(totalLuckyDrawClaimedUSDC)}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 pt-2">
                Raffle winners are selected randomly from daily participants.
              </p>
            </div>
          </div>
        </div>

        {/* Top 10 All-Time Earners */}
        <div className="bg-white dark:bg-[#0f0f10] rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Top 10 All-Time Earners</h2>
          </div>

          {topEarnersQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : topEarnersQuery.data && topEarnersQuery.data.length > 0 ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {topEarnersQuery.data.map((earner, idx) => (
                <div key={earner.player} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold',
                        idx === 0
                          ? 'bg-yellow-500/20 text-yellow-600'
                          : idx === 1
                            ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                            : idx === 2
                              ? 'bg-orange-500/20 text-orange-600'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{earner.username || 'Anonymous'}</p>
                      <p className="text-xs text-zinc-500 font-mono">{formatAddress(earner.player)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{formatUSDC(earner.totalEarned)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                <Award className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">Coming Soon</p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                Earnings data will be available once the indexer is live.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
