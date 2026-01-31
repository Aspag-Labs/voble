import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Loader2, Ticket, Clock, AlertCircle } from 'lucide-react'
import { PrizeVaultsDisplay } from '@/components/prize-vaults-display'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Check if current time is within the midnight blackout window
// Blackout: 25 minutes before and 25 minutes after midnight (23:35 - 00:25 UTC+8)
function isInBlackoutWindow(): { isBlackout: boolean; minutesUntilOpen: number } {
  const now = new Date()
  // Convert to UTC+8
  const utc8Offset = 8 * 60 // minutes
  const localOffset = now.getTimezoneOffset() // minutes (negative for UTC+)
  const utc8Time = new Date(now.getTime() + (utc8Offset + localOffset) * 60 * 1000)

  const hours = utc8Time.getHours()
  const minutes = utc8Time.getMinutes()
  const totalMinutes = hours * 60 + minutes

  // Blackout window: 23:35 (1415 min) to 24:00 (1440 min) OR 00:00 (0 min) to 00:25 (25 min)
  const beforeMidnightStart = 23 * 60 + 35 // 23:35 = 1415 minutes
  const afterMidnightEnd = 25 // 00:25 = 25 minutes

  if (totalMinutes >= beforeMidnightStart) {
    // Before midnight blackout (23:35 - 23:59)
    const minutesUntilMidnight = 1440 - totalMinutes
    return { isBlackout: true, minutesUntilOpen: minutesUntilMidnight + afterMidnightEnd }
  } else if (totalMinutes < afterMidnightEnd) {
    // After midnight blackout (00:00 - 00:25)
    return { isBlackout: true, minutesUntilOpen: afterMidnightEnd - totalMinutes }
  }

  return { isBlackout: false, minutesUntilOpen: 0 }
}

interface GameLobbyProps {
  isStartingGame: boolean
  isBuyingTicket: boolean
  ticketPurchased: boolean
  vrfCompleted: boolean
  showEnterArena: boolean
  showPrizeVaults: boolean
  isAlreadyPlayedToday: boolean
  onBuyTicket: () => void
  error?: string | null
}

export function GameLobby({
  isStartingGame,
  isBuyingTicket,
  ticketPurchased,
  vrfCompleted,
  showEnterArena,
  showPrizeVaults,
  isAlreadyPlayedToday,
  onBuyTicket,
  error,
}: GameLobbyProps) {
  const [blackoutState, setBlackoutState] = useState(() => isInBlackoutWindow())

  // Update blackout state every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setBlackoutState(isInBlackoutWindow())
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  const isButtonDisabled = isBuyingTicket || isAlreadyPlayedToday || blackoutState.isBlackout
  return (
    <>
      {/* LOBBY: Prize Pool Display */}
      {showPrizeVaults && (
        <div className="mb-8">
          <PrizeVaultsDisplay />
        </div>
      )}

      {/* GAME INITIALIZATION LOADING STATE */}
      {isStartingGame && (
        <div className="mb-12 py-24 relative overflow-hidden rounded-3xl bg-zinc-900 dark:bg-black text-white shadow-2xl flex flex-col items-center justify-center border border-zinc-800">
          {/* Subtle static gradient with Voble brand blue */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1877F2]/10 via-transparent to-zinc-950/50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(24,119,242,0.12)_0%,transparent_60%)]" />

          <div className="relative mb-8 z-10">
            <div className="h-20 w-20 rounded-2xl bg-zinc-800/50 backdrop-blur flex items-center justify-center border border-zinc-700">
              <Ticket className="w-8 h-8 text-indigo-400" />
            </div>
            <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center animate-spin">
              <Loader2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-black mb-3 tracking-tight z-10">Entering Arena...</h2>
          <div className="flex flex-col items-center gap-2 text-zinc-400 text-sm z-10 font-mono">
            <p className="flex items-center gap-2">
              {ticketPurchased ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              Verifying funds
            </p>
            <p className="flex items-center gap-2">
              {vrfCompleted ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              Getting a Random Word (VRF)
            </p>
            <p className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Preparing Game Board
            </p>
          </div>
        </div>
      )}

      {/* LOBBY: ENTER ARENA CARD */}
      {/* Condition: !isStartingGame && showEnterArena */}
      {!isStartingGame && showEnterArena && (
        <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0f] border border-zinc-800">
          {/* Scan lines effect */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center px-6 py-16 sm:py-20">

            <h2 className="text-4xl sm:text-6xl font-black text-white mb-6 tracking-tighter">
              Ready to Compete?
            </h2>

            <p className="text-lg text-zinc-400 max-w-md mb-10 leading-relaxed">
              Test your vocabulary skills on Voble. Solve the word, climb the leaderboard, win the prize.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      {' '}
                      {/* Wrapper div is often needed for disabled buttons in tooltips to work consistently */}
                      <Button
                        onClick={onBuyTicket}
                        disabled={isButtonDisabled}
                        size="lg"
                        className="w-full h-16 text-xl font-bold bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-0 transition-all hover:scale-[1.02] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0"
                      >
                        {isBuyingTicket ? (
                          <>
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            Processing...
                          </>
                        ) : isAlreadyPlayedToday ? (
                          <span className="flex items-center gap-2">Come Back Tomorrow</span>
                        ) : blackoutState.isBlackout ? (
                          <span className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Arena Resetting...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Enter Arena <span className="opacity-70 font-normal ml-1">| $1 USDC</span>
                          </span>
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {isAlreadyPlayedToday && (
                    <TooltipContent>
                      <p>You have already played today's game. Please wait for the daily reset.</p>
                    </TooltipContent>
                  )}
                  {blackoutState.isBlackout && !isAlreadyPlayedToday && (
                    <TooltipContent>
                      <p>Arena resets at midnight. Come back in {blackoutState.minutesUntilOpen} minutes!</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Inline Error Alert */}
            {error && (
              <div className="mt-6 w-full max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-400 font-medium break-words">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div >
      )
      }
    </>
  )
}
