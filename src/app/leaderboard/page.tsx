'use client'

import { useState, useEffect, useMemo } from 'react'
import { Users, Clock, Medal, Crown, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWallets } from '@privy-io/react-auth/solana'

import { useLeaderboard } from '@/hooks/use-leaderboard'
import { useVaultBalances } from '@/hooks/use-vault-balances'

type PeriodType = 'daily' | 'weekly' | 'monthly'

const formatDuration = (ms: number) => {
  if (!ms) return ''
  const seconds = Math.floor(ms / 1000)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export default function LeaderboardPage() {
  const [activePeriod, setActivePeriod] = useState<PeriodType>('daily')
  const { wallets } = useWallets()
  const currentUserAddress = wallets[0]?.address

  const {
    entries,
    totalPlayers,
    isLoading,
    userRank,
    refetch: refetchLeaderboard,
    isFetching: isFetchingLeaderboard,
  } = useLeaderboard(activePeriod)

  const { balances, refetch: refetchBalances, isFetching: isFetchingBalances } = useVaultBalances()
  const [timeLeft, setTimeLeft] = useState('')
  const [isRateLimited, setIsRateLimited] = useState(false)

  const isRefreshing = isFetchingLeaderboard || isFetchingBalances
  const STORAGE_KEY = 'voble_leaderboard_refresh_limit_v2'

  const checkRateLimit = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return false

      const { count, lastTimestamp } = JSON.parse(data)
      const now = Date.now()

      // If > 1 hour passed since last interaction, we are free to go (new cycle)
      if (now - lastTimestamp >= 60 * 60 * 1000) return false

      // Otherwise we are inside the window. Check if we hit the limit.
      return count >= 3
    } catch {
      return false
    }
  }

  // Initial check & interval
  useEffect(() => {
    setIsRateLimited(checkRateLimit())
    const interval = setInterval(() => setIsRateLimited(checkRateLimit()), 5000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    if (checkRateLimit()) return

    refetchLeaderboard()
    refetchBalances()

    try {
      const now = Date.now()
      const data = localStorage.getItem(STORAGE_KEY)
      let newData = { count: 1, lastTimestamp: now }

      if (data) {
        const parsed = JSON.parse(data)
        // If within 1 hour window, increment. Else it stays reset to 1 (from init above)
        if (now - parsed.lastTimestamp < 60 * 60 * 1000) {
          newData.count = parsed.count + 1
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
      setIsRateLimited(checkRateLimit())
    } catch (e) {
      console.error(e)
    }
  }

  // Timer Logic (Preserved)
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const utc8TimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' })
      const nowUtc8 = new Date(utc8TimeStr)
      const targetDate = new Date(nowUtc8)

      if (activePeriod === 'daily') {
        targetDate.setDate(nowUtc8.getDate() + 1)
        targetDate.setHours(0, 0, 0, 0)
      } else if (activePeriod === 'weekly') {
        const day = nowUtc8.getDay()
        const daysUntilMonday = (8 - day) % 7 || 7
        targetDate.setDate(nowUtc8.getDate() + daysUntilMonday)
        targetDate.setHours(0, 0, 0, 0)
      } else if (activePeriod === 'monthly') {
        targetDate.setMonth(nowUtc8.getMonth() + 1)
        targetDate.setDate(1)
        targetDate.setHours(0, 0, 0, 0)
      }

      const diff = targetDate.getTime() - nowUtc8.getTime()
      if (diff <= 0) return 'Calculating...'

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (activePeriod === 'daily') return `${hours}h ${minutes}m ${seconds}s`
      return `${days}d ${hours}h ${minutes}m ${seconds}s`
    }

    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    setTimeLeft(calculateTimeLeft())
    return () => clearInterval(timer)
  }, [activePeriod])

  const formatAddress = (address: string) => {
    if (!address || address.length <= 8) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const getPrizePoolForPeriod = (period: PeriodType) => {
    if (!balances) return 0
    switch (period) {
      case 'daily':
        return balances.daily.balance
      case 'weekly':
        return balances.weekly.balance
      case 'monthly':
        return balances.monthly.balance
      default:
        return 0
    }
  }

  const prizePool = getPrizePoolForPeriod(activePeriod)

  // Tiered winner counts per period
  const WINNER_COUNTS: Record<PeriodType, number> = {
    daily: 10,
    weekly: 5,
    monthly: 3,
  }

  // Tiered prize splits per period (basis points, sum to 10000)
  const PRIZE_SPLITS: Record<PeriodType, number[]> = {
    daily: [3500, 2000, 1200, 800, 600, 500, 400, 400, 300, 300], // 10 winners
    weekly: [4000, 2500, 1500, 1200, 800], // 5 winners
    monthly: [5000, 3000, 2000], // 3 winners
  }

  const isWinner = (rank: number) => rank <= WINNER_COUNTS[activePeriod]

  // Rank Styling Helpers - consistent background, separator distinguishes winners
  const getRankStyles = (rank: number) => {
    // All rows have consistent styling - separator line distinguishes winners from non-winners
    if (isWinner(rank)) {
      return ''
    }
    // Non-winners - slightly dimmed
    return 'opacity-60'
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-slate-400 fill-slate-400" />
      case 3:
        return <Medal className="w-5 h-5 text-orange-500 fill-orange-500" />
      default:
        if (isWinner(rank)) {
          return (
            <span className="font-mono text-white font-bold w-5 text-center">#{rank}</span>
          )
        }
        return <span className="font-mono text-zinc-400 font-medium w-5 text-center">#{rank}</span>
    }
  }

  const getPrizeShare = (rank: number) => {
    const splits = PRIZE_SPLITS[activePeriod]
    if (rank < 1 || rank > splits.length) return null

    const bps = splits[rank - 1]
    const percent = (bps / 100).toFixed(bps % 100 === 0 ? 0 : 1) + '%'
    const value = (prizePool * bps) / 10000

    return { percent, value }
  }

  // Generate a consistent gradient for avatars based on address
  const getAvatarGradient = (address: string) => {
    const gradients = [
      'from-blue-400 to-indigo-500',
      'from-emerald-400 to-teal-500',
      'from-orange-400 to-red-500',
      'from-pink-400 to-rose-500',
      'from-violet-400 to-purple-500',
    ]
    const index = address.charCodeAt(address.length - 1) % gradients.length
    return gradients[index]
  }

  const userEntry = useMemo(() => {
    if (!userRank) return null
    return entries.find((e) => e.rank === userRank)
  }, [entries, userRank])

  return (
    <div className="min-h-screen bg-[#09090b] pb-24">
      {/* Header Section */}
      <div className="bg-[#22c55e]/10 border-b border-[#22c55e]/20">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Period Tabs */}
          <div className="flex items-center justify-center gap-1 mb-6">
            {(['daily', 'weekly', 'monthly'] as PeriodType[]).map((period) => (
              <button
                key={period}
                onClick={() => setActivePeriod(period)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all',
                  activePeriod === period
                    ? 'bg-[#22c55e] text-white'
                    : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Prize Display */}
          <div className="text-center mb-4">
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-2">
              {activePeriod} Prize Pool
            </p>
            <h1 className="text-5xl md:text-6xl font-black text-[#22c55e] tracking-tight">
              ${prizePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <Users className="w-4 h-4" />
              <span className="font-medium">{totalPlayers.toLocaleString()} players</span>
            </div>
            <div className="w-px h-4 bg-zinc-700" />
            <div className="flex items-center gap-2 text-zinc-400 font-mono">
              <Clock className="w-4 h-4" />
              <span>{timeLeft}</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isRateLimited}
              className="p-1.5 rounded text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
            >
              <RotateCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>
      {/* Leaderboard List */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-[#0a0c16e6] rounded-xl border border-zinc-800 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 sm:px-6 py-4 border-b border-zinc-700 bg-[#0a0c16] text-xs font-medium text-zinc-400 uppercase tracking-wider">
            <div className="col-span-6 sm:col-span-5">Player</div>
            <div className="col-span-3 sm:col-span-4 text-right">Score</div>
            <div className="col-span-3 text-right">Prize</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {isLoading ? (
              <div className="p-12 text-center text-zinc-500">Loading standings...</div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">No players yet. Be the first!</div>
            ) : (
              entries.map((player, index) => {
                const prize = getPrizeShare(player.rank)
                const playerIsWinner = isWinner(player.rank)
                const isLastWinner = player.rank === WINNER_COUNTS[activePeriod]
                const nextPlayer = entries[index + 1]
                const showWinnerSeparator = isLastWinner && nextPlayer && !isWinner(nextPlayer.rank)

                // Check if this row is the current user
                const isCurrentUser = currentUserAddress && player.player === currentUserAddress

                return (
                  <div key={player.rank}>
                    <div
                      className={cn(
                        'grid grid-cols-12 gap-2 px-4 sm:px-6 py-4 items-center transition-colors group',
                        getRankStyles(player.rank),
                        // Simple highlight for current user
                        isCurrentUser && 'bg-blue-100 dark:bg-blue-500/20 border-l-4 border-l-blue-500',
                      )}
                    >
                      {/* Player (with embedded rank icon) */}
                      <div className="col-span-6 sm:col-span-5 flex items-center gap-2 sm:gap-3">
                        {/* Rank icon */}
                        <div className="flex-shrink-0 w-6 flex items-center justify-center">
                          {getRankIcon(player.rank)}
                        </div>
                        {/* Avatar */}
                        <div
                          className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold',
                            getAvatarGradient(player.player),
                          )}
                        >
                          {player.username ? player.username[0].toUpperCase() : 'P'}
                        </div>
                        {/* Name */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={cn(
                              'font-medium text-sm truncate',
                              playerIsWinner ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400',
                            )}
                          >
                            {player.username || 'Anonymous'}
                          </span>
                          {isCurrentUser && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500 text-white">
                              You
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score (with stats for daily) */}
                      <div className="col-span-3 sm:col-span-4 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={cn(
                              'font-bold tabular-nums',
                              playerIsWinner
                                ? 'text-base sm:text-lg text-zinc-900 dark:text-white'
                                : 'text-sm sm:text-base text-zinc-500 dark:text-zinc-400',
                            )}
                          >
                            {player.score.toLocaleString()}
                          </span>
                          <span className="text-[10px] sm:text-xs text-zinc-400">
                            {activePeriod === 'daily' ? (
                              <>
                                {player.guessesUsed}g{player.timeMs > 0 && ` • ${formatDuration(player.timeMs)}`}
                              </>
                            ) : (
                              `${player.gamesPlayed} game${player.gamesPlayed !== 1 ? 's' : ''}`
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Prize */}
                      <div className="col-span-3 flex justify-end items-center">
                        {prize ? (
                          <div className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20">
                            <span className="font-bold text-sm sm:text-base text-[#22c55e] tabular-nums">
                              ${prize.value.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-sm">—</span>
                        )}
                      </div>
                    </div>

                    {/* Winner/Non-winner separator */}
                    {showWinnerSeparator && (
                      <div className="flex items-center gap-4 px-4 sm:px-6 py-3 bg-zinc-100/50 dark:bg-zinc-900/50">
                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                        <span className="text-[10px] sm:text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                          Top {WINNER_COUNTS[activePeriod]} Win Prizes
                        </span>
                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
