import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Coins, Users } from 'lucide-react'
import { ReferralDashboard } from '@/components/referral-dashboard'
import { useState } from 'react'

interface RewardsWidgetProps {
  points: number
  isTrading: boolean
  onTrade: (amount: number) => void
}

export function RewardsWidget({ points, isTrading, onTrade }: RewardsWidgetProps) {
  const [amount, setAmount] = useState<number>(Math.min(100, points))

  return (
    <Card className="border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 pt-5 pb-0 gap-0">
      <CardHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800/50">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Coins className="h-4 w-4 text-orange-500" />
          Rewards & Referrals
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-6 pt-4 pb-4 space-y-4">
          {/* Points Trading Section */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Activity Points</h3>
                <p className="text-xs text-muted-foreground">Trade points for $VOBLE tokens</p>
              </div>
              <span className="text-2xl font-bold font-mono text-orange-600">{points.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800/50 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(Math.floor(points * 0.25))}
                  className="text-xs h-8"
                >
                  25%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(Math.floor(points * 0.5))}
                  className="text-xs h-8"
                >
                  50%
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAmount(points)} className="text-xs h-8">
                  Max
                </Button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max={points}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button
                  onClick={() => onTrade(amount)}
                  disabled={isTrading || amount <= 0 || amount > points}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isTrading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Trade'}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                You get: <span className="font-mono font-bold text-foreground">{(amount * 500).toLocaleString()}</span>{' '}
                $VOBLE
              </p>
            </div>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full my-4" />

          {/* Referrals Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Refer Friends</h3>
              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-medium">
                Coming Soon
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full ml-auto">
                Earn 20%
              </span>
            </div>
            <ReferralDashboard embedded />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
