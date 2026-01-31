import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Check, Clock, Copy, Share2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface ProfileHeaderProps {
  profile: any // Should be typed properly based on usage
  walletAddress?: string
  rankData?: {
    percentile: number | null
    rank: number | null
    totalPlayers: number | null
  }
  winRate: number
  currentStreak: number
}

export function ProfileHeader({ profile, walletAddress, rankData, winRate, currentStreak }: ProfileHeaderProps) {
  const [copied, setCopied] = useState(false)

  const copyWallet = () => {
    if (!walletAddress) return
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    toast.success('Wallet address copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    const text =
      `🎮 My Voble Stats!\n\n` +
      `👤 ${profile.username}\n` +
      `📊 ${profile.totalGamesPlayed} games | ${profile.gamesWon} wins\n` +
      `🎯 Win Rate: ${winRate}%\n` +
      `🔥 Streak: ${currentStreak}\n` +
      (rankData?.percentile ? `🏆 Top ${rankData.percentile}% of players\n` : '') +
      `\nPlay now at voble.xyz`

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(twitterUrl, '_blank')
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const truncatedWallet = walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : ''

  return (
    <Card className="mb-6 border-none shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center flex-1">
            <Avatar className="h-20 w-20 border-2 border-zinc-100 dark:border-zinc-800">
              <AvatarFallback className="text-2xl bg-zinc-100 dark:bg-zinc-800 font-bold">
                {profile.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{profile.username}</h1>
                {rankData?.percentile && (
                  <Badge
                    variant="secondary"
                    className="bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 border-none"
                  >
                    Top {rankData.percentile}%
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={copyWallet}
                  className="flex items-center gap-2 text-muted-foreground font-mono text-xs md:text-sm hover:text-foreground transition-colors bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-md"
                >
                  {truncatedWallet}
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {formatDate(Number(profile.createdAt))}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Last played {formatDate(Number(profile.lastPlayed))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
              <Share2 className="h-4 w-4" />
              Share Stats
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
