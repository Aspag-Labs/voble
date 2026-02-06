'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trophy, CheckCircle, ArrowRight, RotateCw, Ticket, Clock } from 'lucide-react'
import { useLuckyDrawData } from '@/hooks/use-lucky-draw'
import { cn } from '@/lib/utils'

export default function RafflePage() {
  const router = useRouter()
  const { currentBalance, nextDrawIn, totalEligiblePlayers, recentWinners, isEligible, isLoading, refetch } =
    useLuckyDrawData()

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Section */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Badge */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-muted border border-border">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Weekly Raffle</span>
            </div>
          </div>

          {/* Prize Display */}
          <div className="text-center mb-4">
            <p className="text-muted-foreground text-xs uppercase tracking-widest mb-2">
              Jackpot Prize
            </p>
            <h1 className="text-5xl md:text-6xl font-black text-primary tracking-tight">
              ${isLoading ? '...' : currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h1>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-medium">{totalEligiblePlayers} eligible</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 text-muted-foreground font-mono">
              <Clock className="w-4 h-4" />
              <span>{nextDrawIn}</span>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              <RotateCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {/* Your Status Card */}
        <div className="bg-card rounded-2xl border border-border p-1 relative overflow-hidden">
          <div
            className={cn(
              'rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6',
              isEligible
                ? 'bg-muted'
                : 'bg-muted',
            )}
          >
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
                  isEligible ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground',
                )}
              >
                {isEligible ? <CheckCircle className="w-6 h-6" /> : <Ticket className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {isEligible ? "You're Entered!" : 'You are not entered yet'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isEligible
                    ? 'Good luck! The draw happens automatically on Sunday.'
                    : 'Play at least 1 game this week to qualify for the jackpot.'}
                </p>
              </div>
            </div>

            {!isEligible && (
              <Button
                onClick={() => router.push('/')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-full px-6 w-full sm:w-auto"
              >
                Play Now <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* How it Works - Simplified 2 Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card p-6 rounded-xl border border-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg">
              1
            </div>
            <div>
              <h4 className="font-bold text-foreground">Play a Game</h4>
              <p className="text-sm text-muted-foreground">Complete just 1 game to enter.</p>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg">
              2
            </div>
            <div>
              <h4 className="font-bold text-foreground">Win Jackpot</h4>
              <p className="text-sm text-muted-foreground">Winner randomly drawn Sunday @ Midnight.</p>
            </div>
          </div>
        </div>

        {/* Hall of Fame / Recent Winners */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Hall of Fame</h2>
            </div>
          </div>

          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading history...</div>
            ) : recentWinners.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/10 mb-4">
                  <Trophy className="w-8 h-8 text-amber-300" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">No Winners Yet</h3>
                <p className="text-muted-foreground text-sm">The next draw could be the first!</p>
              </div>
            ) : (
              recentWinners.map((winner, i) => (
                <div
                  key={i}
                  className="px-6 py-4 flex items-center justify-between hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 text-xs font-bold">
                      W{winner.week}
                    </div>
                    <div>
                      <p className="font-mono font-medium text-foreground text-sm">{winner.address}</p>
                      <p className="text-xs text-muted-foreground">{winner.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-600 dark:text-amber-500">+{winner.amount} USDC</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
