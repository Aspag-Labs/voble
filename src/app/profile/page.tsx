'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wallet, Loader2, AlertCircle } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import {
  useCurrentUserProfile,
  useClaim,
  useTradeActivityPoints,
  type UnclaimedPrize,
  type UnclaimedRaffle,
} from '@/hooks'

import { useGameHistory } from '@/hooks/use-game-history'
import { usePlayerRank } from '@/hooks/use-player-rank'

// Import new components
import {
  ProfileHeader,
  StatsOverview,
  GuessDistribution,
  ActivityHeatmap,
  PrizeCenter,
  RewardsWidget,
  CreateProfileForm,
  GameHistoryList,
  MobileTabs,
  type ProfileTab,
} from '@/components/profile'

export default function ProfilePage() {

  const { ready, authenticated, login } = usePrivy()
  const { wallets } = useWallets()

  const wallet = wallets[0]

  // Fetch user profile from blockchain
  const { profile, isLoading: loadingProfile, error, exists: hasProfile, refetch } = useCurrentUserProfile()

  // Fetch game history from Supabase
  const { games: dbGameHistory, isLoading: loadingHistory } = useGameHistory()

  // Fetch player rank
  const { data: rankData } = usePlayerRank()

  // ====== LEADERBOARD PRIZE CLAIM LOGIC ======
  const {
    claimPrize,
    claimLuckyDraw,
    getAllUnclaimedPrizes,
    getAllUnclaimedRaffles,
    isClaimingPrize,
    isClaimingLuckyDraw: isClaimingRaffle,
  } = useClaim()

  // Prize State
  const [claimablePrizes, setClaimablePrizes] = useState<UnclaimedPrize[]>([])
  const [hasCheckedPrize, setHasCheckedPrize] = useState(false)
  const [claimMessage, setClaimMessage] = useState<string | null>(null)

  // Raffle State
  const [rafflePrizes, setRafflePrizes] = useState<UnclaimedRaffle[]>([])
  const [hasCheckedRaffle, setHasCheckedRaffle] = useState(false)

  // Check for all unclaimed leaderboard prizes (blockchain-based)
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!wallet?.address) return
      try {
        const prizes = await getAllUnclaimedPrizes()
        if (cancelled) return
        setClaimablePrizes(prizes)
        setHasCheckedPrize(true)
      } catch (err) {
        console.error('Error checking prizes:', err)
        if (!cancelled) setHasCheckedPrize(true)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [getAllUnclaimedPrizes, wallet?.address])

  // Check for all unclaimed raffle prizes (blockchain-based + API)
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!wallet?.address) return
      try {
        const raffles = await getAllUnclaimedRaffles()
        if (cancelled) return
        setRafflePrizes(raffles)
        setHasCheckedRaffle(true)
      } catch (err) {
        console.error('Error checking raffle prizes:', err)
        if (!cancelled) setHasCheckedRaffle(true)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [getAllUnclaimedRaffles, wallet?.address])

  // ====== CLAIM HANDLERS ======
  const handleClaimPrize = async (prize: UnclaimedPrize) => {
    setClaimMessage(null)
    const result = await claimPrize(prize.periodType, prize.periodId)
    if (result.success) {
      // Remove claimed prize from list
      setClaimablePrizes((prev) => prev.filter((p) => p.address !== prize.address))
      await refetch()
    } else if (result.error) {
      setClaimMessage(result.error)
    }
  }

  const handleClaimRafflePrize = async (raffle: UnclaimedRaffle) => {
    const result = await claimLuckyDraw(raffle.periodId)
    if (result.success) {
      // Remove claimed raffle from list
      setRafflePrizes((prev) => prev.filter((r) => r.address !== raffle.address))
      await refetch()
    }
  }

  // ====== TRADE POINTS LOGIC ======
  const { tradePoints, isTrading } = useTradeActivityPoints()

  const handleTradePoints = async (amount: number) => {
    if (!profile || amount <= 0 || amount > Number(profile.activityPoints)) return
    const result = await tradePoints(amount)
    if (result.success) {
      await refetch()
    }
  }

  // ====== STATS CALCULATION ======
  const { guessDistribution, averageGuesses, currentStreak } = useMemo(() => {
    if (!dbGameHistory || dbGameHistory.length === 0) {
      return { guessDistribution: [0, 0, 0, 0, 0, 0, 0], averageGuesses: 0, currentStreak: 0 }
    }

    // 1. Distribution
    const distribution = [0, 0, 0, 0, 0, 0, 0]
    let totalGuesses = 0
    let wonGames = 0

    for (const game of dbGameHistory) {
      if (game.is_won && game.guesses_used >= 1 && game.guesses_used <= 7) {
        distribution[game.guesses_used - 1]++
        totalGuesses += game.guesses_used
        wonGames++
      }
    }
    const avgGuesses = wonGames > 0 ? Math.round((totalGuesses / wonGames) * 10) / 10 : 0

    // 2. Streaks - Using period_id which is in UTC+8 format (YYYY-MM-DD)
    // Get unique dates from period_id (already in UTC+8)
    const playedDates = [...new Set(dbGameHistory.map((g) => g.period_id))].sort().reverse()

    let current = 0
    // Get today and yesterday in UTC+8
    const nowUtc8 = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }))
    const todayUtc8 = nowUtc8.toISOString().split('T')[0]
    const yesterdayUtc8 = new Date(nowUtc8.getTime() - 86400000).toISOString().split('T')[0]

    if (playedDates[0] === todayUtc8 || playedDates[0] === yesterdayUtc8) {
      current = 1
      for (let i = 1; i < playedDates.length; i++) {
        const prev = new Date(playedDates[i - 1])
        const curr = new Date(playedDates[i])
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000)
        if (diffDays === 1) current++
        else break
      }
    }

    return { guessDistribution: distribution, averageGuesses: avgGuesses, currentStreak: current }
  }, [dbGameHistory])

  // ====== TABS STATE (MOBILE) ======
  const [currentTab, setCurrentTab] = useState<ProfileTab>('overview')

  // ====== LOADING / ERROR STATES ======

  // Wallet Check
  if (!authenticated || !wallet) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-12 border-none shadow-lg">
          <CardContent>
            <Wallet className="h-16 w-16 mx-auto mb-6 text-slate-200 dark:text-zinc-800" />
            <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-50">Connect Your Wallet</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Connect your Solana wallet to view your personalized player profile, track your stats, and claim rewards.
            </p>
            <Button onClick={login} size="lg" className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading
  if (!ready || loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-slate-500 font-medium text-sm">Loading player profile...</p>
        </div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] p-8">
        <Alert variant="destructive" className="max-w-xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load profile data. Please try again later.</AlertDescription>
        </Alert>
      </div>
    )
  }

  // No Profile - Show inline create form
  if (!hasProfile || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] flex items-center justify-center p-4">
        <CreateProfileForm onSuccess={refetch} />
      </div>
    )
  }

  const winRate = profile.totalGamesPlayed > 0 ? Math.round((profile.gamesWon / profile.totalGamesPlayed) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] pb-20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 1. Header Section - Always Visible */}
        <ProfileHeader
          profile={profile}
          walletAddress={wallet.address}
          rankData={rankData}
          winRate={winRate}
          currentStreak={currentStreak}
        />

        {/* 2. Mobile Tabs Switcher - Hidden on Desktop */}
        <MobileTabs currentTab={currentTab} onTabChange={setCurrentTab} />

        {/* 3. MOBILE VIEW CONTENT */}
        <div className="block md:hidden space-y-6">
          {currentTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StatsOverview
                stats={{
                  totalGamesPlayed: Number(profile.totalGamesPlayed),
                  gamesWon: Number(profile.gamesWon),
                  winRate: winRate,
                  currentStreak: currentStreak,
                  bestScore: Number(profile.bestScore),
                }}
              />
              <GuessDistribution distribution={guessDistribution} />
            </div>
          )}

          {currentTab === 'history' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ActivityHeatmap gameHistory={dbGameHistory || []} />
              <GameHistoryList history={dbGameHistory || []} isLoading={loadingHistory} onViewAll={() => { }} />
            </div>
          )}

          {currentTab === 'rewards' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PrizeCenter
                claimablePrizes={claimablePrizes}
                rafflePrizes={rafflePrizes}
                hasCheckedPrize={hasCheckedPrize}
                hasCheckedRaffle={hasCheckedRaffle}
                isClaiming={isClaimingPrize}
                isClaimingRaffle={isClaimingRaffle}
                onClaimPrize={handleClaimPrize}
                onClaimRafflePrize={handleClaimRafflePrize}
                totalPrizeWinnings={profile?.totalPrizeWinnings}
                totalLuckyDrawWinnings={profile?.totalLuckyDrawWinnings}
              />
              <RewardsWidget
                points={Number(profile?.activityPoints || 0)}
                isTrading={isTrading}
                onTrade={handleTradePoints}
              />
            </div>
          )}
        </div>

        {/* 4. DESKTOP VIEW CONTENT - Hidden on Mobile */}
        <div className="hidden md:block space-y-6">
          {/* Key Stats (Bento Top) */}
          <StatsOverview
            stats={{
              totalGamesPlayed: Number(profile.totalGamesPlayed),
              gamesWon: Number(profile.gamesWon),
              winRate: winRate,
              currentStreak: currentStreak,
              bestScore: Number(profile.bestScore),
            }}
          />

          <div className="grid grid-cols-3 gap-6">
            {/* LEFT COLUMN (2/3 width) */}
            <div className="col-span-2 space-y-6">
              <PrizeCenter
                claimablePrizes={claimablePrizes}
                rafflePrizes={rafflePrizes}
                hasCheckedPrize={hasCheckedPrize}
                hasCheckedRaffle={hasCheckedRaffle}
                isClaiming={isClaimingPrize}
                isClaimingRaffle={isClaimingRaffle}
                onClaimPrize={handleClaimPrize}
                onClaimRafflePrize={handleClaimRafflePrize}
                totalPrizeWinnings={profile?.totalPrizeWinnings}
                totalLuckyDrawWinnings={profile?.totalLuckyDrawWinnings}
              />
              <ActivityHeatmap gameHistory={dbGameHistory || []} />
              <GameHistoryList history={dbGameHistory || []} isLoading={loadingHistory} onViewAll={() => { }} />
            </div>

            {/* RIGHT COLUMN (1/3 width) */}
            <div className="col-span-1 space-y-6">
              <RewardsWidget
                points={Number(profile?.activityPoints || 0)}
                isTrading={isTrading}
                onTrade={handleTradePoints}
              />
              <GuessDistribution distribution={guessDistribution} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
