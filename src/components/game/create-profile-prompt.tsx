import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Share2, Target, Trophy, UserCircle, Zap } from 'lucide-react'

export function CreateProfilePrompt() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-8 sm:p-12">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-8">
            <UserCircle className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          </div>

          {/* Title */}
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white mb-3">Create Your Profile</h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              Join the leaderboard and compete for daily prizes
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            {[
              { icon: Trophy, text: 'Win Prizes' },
              { icon: Target, text: 'Track Stats' },
              { icon: Zap, text: 'Gasless Play' },
              { icon: Share2, text: 'Share Wins' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <item.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-zinc-900 dark:text-white">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Button */}
          <Link href="/profile">
            <Button size="lg" className="w-full h-14 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
              Create Profile <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
