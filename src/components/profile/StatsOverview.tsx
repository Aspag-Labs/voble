import { Card, CardContent } from '@/components/ui/card'
import { Flame, Trophy, TrendingUp, Target, Gamepad2 } from 'lucide-react'

interface StatsOverviewProps {
  stats: {
    totalGamesPlayed: number
    gamesWon: number
    winRate: number
    currentStreak: number
    bestScore: number
  }
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
      <StatCard
        label="Total Games"
        value={stats.totalGamesPlayed.toLocaleString()}
        icon={Gamepad2}
        colorClass="text-blue-600 dark:text-blue-400"
        bgClass="bg-blue-50 dark:bg-blue-950/20"
      />
      <StatCard
        label="Wins"
        value={stats.gamesWon.toLocaleString()}
        icon={Target}
        colorClass="text-green-600 dark:text-green-400"
        bgClass="bg-green-50 dark:bg-green-950/20"
      />
      <StatCard
        label="Win Rate"
        value={`${stats.winRate}%`}
        icon={TrendingUp}
        colorClass="text-purple-600 dark:text-purple-400"
        bgClass="bg-purple-50 dark:bg-purple-950/20"
      />
      <StatCard
        label="Current Streak"
        value={stats.currentStreak.toString()}
        icon={Flame}
        colorClass="text-orange-600 dark:text-orange-400"
        bgClass="bg-orange-50 dark:bg-orange-950/20"
      />
      <StatCard
        label="Best Score"
        value={stats.bestScore.toLocaleString()}
        icon={Trophy}
        colorClass="text-yellow-600 dark:text-yellow-400"
        bgClass="bg-yellow-50 dark:bg-yellow-950/20"
        className="col-span-2 md:col-span-4 lg:col-span-1"
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
  className = '',
}: {
  label: string
  value: string
  icon: any
  colorClass: string
  bgClass: string
  className?: string
}) {
  return (
    <Card className={`border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 ${className}`}>
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className={`p-2 w-fit rounded-md mb-3 ${bgClass}`}>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
