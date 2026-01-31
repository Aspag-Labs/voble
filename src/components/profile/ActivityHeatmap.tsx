import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ActivityHeatmapProps {
  gameHistory: any[] // Properly type from database schema
}

export function ActivityHeatmap({ gameHistory }: ActivityHeatmapProps) {
  // 1. Process data: Map "YYYY-MM-DD" -> count
  const activityMap = new Map<string, number>()
  gameHistory.forEach((game) => {
    const date = new Date(game.created_at).toISOString().split('T')[0]
    activityMap.set(date, (activityMap.get(date) || 0) + 1)
  })

  // 2. Generate last 365 days (or simplified: last 52 weeks grid)
  // For simplicity and mobile-friendliness, let's show LAST 3 MONTHS (approx 90 days) or ~12 weeks
  const today = new Date()
  const daysToShow = 91 // 13 weeks * 7 days
  const calendarDays = []

  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = activityMap.get(dateStr) || 0
    calendarDays.push({ date: dateStr, count, dayObj: d })
  }

  // Helper for color intensity (similar to GitHub)
  // Since users can only play once per day, it's simple: played (green) vs not played (gray)
  const getColor = (count: number) => {
    if (count === 0) return 'bg-zinc-100 dark:bg-zinc-800/50'
    return 'bg-green-500 dark:bg-green-600' // Vibrant green like GitHub
  }

  // Grid display: weeks (columns) x days (rows) is standard, but simple flex wrap is easier for responsive
  return (
    <Card className="border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Activity Log (Last 90 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
          <TooltipProvider>
            {calendarDays.map((day) => (
              <Tooltip key={day.date}>
                <TooltipTrigger asChild>
                  <div
                    className={`w-3 h-3 rounded-[2px] ${getColor(day.count)} transition-colors cursor-pointer hover:ring-1 hover:ring-offset-1 hover:ring-zinc-400`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {day.dayObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}
