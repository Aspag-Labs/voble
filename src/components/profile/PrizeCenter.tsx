import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Trophy, Gift, DollarSign } from 'lucide-react'
import { useState } from 'react'
import type { UnclaimedPrize, UnclaimedRaffle } from '@/hooks'

interface PrizeCenterProps {
  claimablePrizes: UnclaimedPrize[]
  rafflePrizes: UnclaimedRaffle[]
  hasCheckedPrize: boolean
  hasCheckedRaffle: boolean
  isClaiming: boolean
  isClaimingRaffle: boolean
  onClaimPrize: (prize: UnclaimedPrize) => void
  onClaimRafflePrize: (raffle: UnclaimedRaffle) => void
  // Total claimed prizes (in lamports/smallest unit)
  totalPrizeWinnings?: bigint
  totalLuckyDrawWinnings?: bigint
}

export function PrizeCenter({
  claimablePrizes,
  rafflePrizes,
  hasCheckedPrize,
  hasCheckedRaffle,
  isClaiming,
  isClaimingRaffle,
  onClaimPrize,
  onClaimRafflePrize,
  totalPrizeWinnings = BigInt(0),
  totalLuckyDrawWinnings = BigInt(0),
}: PrizeCenterProps) {
  const [activePrizeTab, setActivePrizeTab] = useState<'leaderboard' | 'raffle'>('leaderboard')

  const totalPrizes = claimablePrizes.length
  const totalRaffles = rafflePrizes.length

  return (
    <Card className="mb-6 border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden">
      <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Prize Center
          </CardTitle>
          <div className="flex gap-1 bg-white dark:bg-zinc-950 p-1 rounded-md border border-zinc-200 dark:border-zinc-800">
            <Button
              variant={activePrizeTab === 'leaderboard' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActivePrizeTab('leaderboard')}
              className="h-7 text-xs"
            >
              Leaderboard{' '}
              {totalPrizes > 0 && (
                <span className="ml-1 bg-green-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                  {totalPrizes}
                </span>
              )}
            </Button>
            <Button
              variant={activePrizeTab === 'raffle' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActivePrizeTab('raffle')}
              className="h-7 text-xs"
            >
              Raffle{' '}
              {totalRaffles > 0 && (
                <span className="ml-1 bg-purple-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                  {totalRaffles}
                </span>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Total Prize Claimed - changes based on active tab */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md">
              <DollarSign className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Prize Claimed</p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                ${(Number(activePrizeTab === 'leaderboard' ? totalPrizeWinnings : totalLuckyDrawWinnings) / 1_000_000).toFixed(2)} USDC
              </p>
            </div>
          </div>
        </div>

        {activePrizeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Leaderboard Rewards</h3>
              <p className="text-sm text-muted-foreground">
                {!hasCheckedPrize
                  ? 'Checking for available prizes...'
                  : totalPrizes === 0
                    ? 'No unclaimed leaderboard prizes found.'
                    : `You have ${totalPrizes} unclaimed prize${totalPrizes > 1 ? 's' : ''}!`}
              </p>
            </div>

            {totalPrizes > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {claimablePrizes.map((prize) => (
                  <div
                    key={prize.address}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 font-bold text-sm">
                        #{prize.rank}
                      </div>
                      <div>
                        <div className="text-base font-semibold text-green-700 dark:text-green-400">
                          ${(prize.amount / 1_000_000).toFixed(2)}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-500">
                          {prize.periodType.charAt(0).toUpperCase() + prize.periodType.slice(1)} • {prize.periodId}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={isClaiming}
                      onClick={() => onClaimPrize(prize)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4 mr-1" />}
                      Claim
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activePrizeTab === 'raffle' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Lucky Draw</h3>
              <p className="text-sm text-muted-foreground">
                {!hasCheckedRaffle
                  ? 'Checking ticket status...'
                  : totalRaffles === 0
                    ? 'No lucky draw wins found.'
                    : `You have ${totalRaffles} unclaimed raffle prize${totalRaffles > 1 ? 's' : ''}!`}
              </p>
            </div>

            {totalRaffles > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {rafflePrizes.map((raffle) => (
                  <div
                    key={raffle.address}
                    className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 font-bold text-sm">
                        🎉
                      </div>
                      <div>
                        <div className="text-base font-semibold text-purple-700 dark:text-purple-400">
                          ${(raffle.amount / 1_000_000).toFixed(2)}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-500">
                          Week {raffle.periodId}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={isClaimingRaffle}
                      onClick={() => onClaimRafflePrize(raffle)}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isClaimingRaffle ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Gift className="h-4 w-4 mr-1" />
                      )}
                      Claim
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
