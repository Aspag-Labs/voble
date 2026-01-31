import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { History, Clock, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface GameHistoryListProps {
  history: any[]
  isLoading: boolean
  onViewAll?: () => void
}

export function GameHistoryList({ history, isLoading, onViewAll }: GameHistoryListProps) {
  const router = useRouter()

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <Card className="border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading game history...</p>
      </Card>
    )
  }

  return (
    <Card className="border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
      <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Matches
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {history && history.length > 0 ? (
          <div>
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
              <div>Date</div>
              <div className="text-center">Score</div>
              <div className="text-center">Guesses</div>
              <div className="text-center">Time</div>
              <div className="text-right">Result</div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {history.map((game) => (
                <div key={game.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  {/* Desktop Row */}
                  <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-4 items-center text-sm">
                    <div className="font-mono text-xs text-muted-foreground">{formatDate(game.created_at)}</div>
                    <div className="text-center font-bold">{game.score}</div>
                    <div className="text-center">{game.guesses_used} / 7</div>
                    <div className="text-center font-mono text-xs text-muted-foreground">
                      {Math.floor(game.time_ms / 1000 / 60)}:
                      {(Math.floor(game.time_ms / 1000) % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={game.is_won ? 'default' : 'destructive'}
                        className={`w-16 justify-center ${game.is_won ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'} border-none shadow-none`}
                      >
                        {game.is_won ? 'Won' : 'Lost'}
                      </Badge>
                    </div>
                  </div>

                  {/* Mobile Row */}
                  <div className="md:hidden p-4 flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs text-muted-foreground">{formatDate(game.created_at)}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{game.score} pts</span>
                        <span className="text-xs text-muted-foreground">• {game.guesses_used}/7 guesses</span>
                      </div>
                    </div>
                    <Badge
                      variant={game.is_won ? 'default' : 'destructive'}
                      className={` ${game.is_won ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'} border-none shadow-none`}
                    >
                      {game.is_won ? 'W' : 'L'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">No games played yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-xs">
              Start playing Voble to see your game history and stats appear here.
            </p>
            <Button onClick={() => router.push('/')}>Play Now</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
