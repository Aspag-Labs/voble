import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

interface GuessDistributionProps {
  distribution: number[]
}

export function GuessDistribution({ distribution }: GuessDistributionProps) {
  // Use first 7 items (guesses 1-7)
  const validDistribution = distribution.slice(0, 7)
  const total = validDistribution.reduce((sum, val) => sum + val, 0)
  const maxVal = Math.max(...validDistribution, 1)

  // Colors: gradient from green (1-3) -> yellow (4-5) -> orange (6-7)
  const getBarColor = (index: number) => {
    if (index < 3) return 'bg-emerald-500'
    if (index < 5) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  return (
    <Card className="border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 py-0 gap-0">
      <CardHeader className="pt-5 pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Guess Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        <div className="space-y-2">
          {validDistribution.map((count, index) => {
            const relScale = (count / maxVal) * 100
            const barColor = getBarColor(index)

            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="w-4 font-mono font-semibold text-center text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex-1 h-5 relative flex items-center bg-zinc-100 dark:bg-zinc-800/30 rounded-sm overflow-hidden">
                  <div
                    className={`${count > 0 ? barColor : ''} h-full rounded-sm transition-all duration-500`}
                    style={{ width: `${Math.max(relScale, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span
                  className={`w-8 text-right text-xs font-mono ${count > 0 ? 'font-medium text-zinc-700 dark:text-zinc-300' : 'text-zinc-400'
                    }`}
                >
                  {count}
                </span>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        {total > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-between text-xs text-muted-foreground">
            <span>Total: {total} games</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
