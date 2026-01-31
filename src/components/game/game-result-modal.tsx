import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Share2, Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface GameResultModalProps {
  isOpen: boolean
  onClose: () => void
  gameStatus: 'won' | 'lost' | 'playing' | 'loading'
  targetWord: string
  guessesLength: number
  score: number
  onShare: () => void
  timeTaken?: number
}

export function GameResultModal({
  isOpen,
  onClose,
  gameStatus,
  targetWord,
  guessesLength,
  score,
  onShare,
  timeTaken,
}: GameResultModalProps) {
  const router = useRouter()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a1a] shadow-2xl">
        <DialogHeader>
          <DialogTitle
            className={`text-2xl font-black text-center mb-2 ${gameStatus === 'won' ? 'text-green-500' : 'text-red-500'}`}
          >
            {gameStatus === 'won' ? 'VICTORY!' : 'GAME OVER'}
          </DialogTitle>
          <DialogDescription className="text-center text-lg text-zinc-600 dark:text-zinc-300">
            The word was <span className="font-bold text-zinc-900 dark:text-white tracking-widest">{targetWord}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center gap-6">
          <div
            className={`grid gap-4 w-full ${gameStatus === 'won' && timeTaken !== undefined ? 'grid-cols-3' : 'grid-cols-2'}`}
          >
            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl text-center border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Guesses</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">{guessesLength}/7</p>
            </div>

            {gameStatus === 'won' && timeTaken !== undefined && (
              <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl text-center border border-zinc-100 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Time</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatTime(timeTaken)}</p>
              </div>
            )}

            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl text-center border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Score</p>
              <p className="text-2xl font-black text-emerald-500">{score.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1 h-12" onClick={onShare}>
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
            <Button
              className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => router.push('/leaderboard')}
            >
              <Trophy className="w-4 h-4 mr-2" /> Leaderboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
