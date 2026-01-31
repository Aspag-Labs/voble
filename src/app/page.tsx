'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import {
  useBuyTicket,
  useSubmitGuess,
  useCompleteGame,
  useFetchSession,
  useUserProfile,
  SessionData,
  LetterResult,
} from '@/hooks'
import { useReferralStats } from '@/hooks/use-referral-stats'
import { getCurrentDayPeriodId } from '@/lib/periods'
import { useInitializeSession } from '@/hooks/use-initialize-session'
import { useRecoverTicket } from '@/hooks/use-recover-ticket'

import { DEMO_WORDS } from '@/lib/demo-words'

// Game Types & Components
import { TileState, GameState } from '@/types/game'
import { GameLoading } from '@/components/game/game-loading'
import { ConnectWallet } from '@/components/game/connect-wallet'
import { CreateProfilePrompt } from '@/components/game/create-profile-prompt'
import { InitializeSessionDialog } from '@/components/game/initialize-session-dialog'
import { GameLobby } from '@/components/game/game-lobby'
import { GameBoard } from '@/components/game/game-board'
import { GameResultModal } from '@/components/game/game-result-modal'

type GuessEntry = NonNullable<SessionData['guesses'][number]>

// All words (target + helper) are now combined in DEMO_WORDS
const ALLOWED_WORDS = DEMO_WORDS

export default function GamePage() {
  const { ready, authenticated, login } = usePrivy()
  const { wallets } = useWallets()
  const wallet = wallets[0]

  // Generate period ID (daily format: YYYY-MM-DD)
  const periodId = getCurrentDayPeriodId()

  const { buyTicket, isLoading: isBuyingTicket, ticketPurchased, vrfCompleted } = useBuyTicket()

  const { submitGuess: submitGuessToBlockchain } = useSubmitGuess()
  const { completeGame } = useCompleteGame()
  const { session, refetch: refetchSession } = useFetchSession(periodId)
  const { initializeSession, isLoading: isInitializing } = useInitializeSession()

  const { profile, isLoading: isLoadingProfile, refetch: refetchProfile } = useUserProfile(wallet?.address)
  const { data: referralStats } = useReferralStats()
  const { recoverTicket, isRecovering } = useRecoverTicket()

  const [gameState, setGameState] = useState<GameState>({
    grid: Array(7)
      .fill(null)
      .map(() =>
        Array(6)
          .fill(null)
          .map(() => ({ letter: '', state: 'empty' })),
      ),
    currentRow: 0,
    currentCol: 0,
    gameStatus: 'playing',
    targetWord: 'SOLANA',
    guesses: [],
    score: 0,
    timeElapsed: 0,
    showResultModal: false,
  })

  const [keyboardState, setKeyboardState] = useState<Record<string, TileState>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const [isStartingGame, setIsStartingGame] = useState(false)
  const [buyTicketError, setBuyTicketError] = useState<string | null>(null)
  const [isProcessingResult, setIsProcessingResult] = useState(false)
  const [purchaseFailed, setPurchaseFailed] = useState(false)
  const [isSessionCreated, setIsSessionCreated] = useState(false)
  // Local flag to bypass stale React Query session data after ticket purchase
  // This fixes the race condition where session?.isCurrentPeriod hasn't updated yet
  const [sessionReady, setSessionReady] = useState(false)

  // Initialize timer from localStorage or session
  useEffect(() => {
    const savedStartTime = localStorage.getItem(`voble_startTime_${periodId}`)
    if (savedStartTime) {
      setStartTime(parseInt(savedStartTime))
    } else if (session?.timeMs) {
      // If no local state but we have session time, approximate start time
      const derivedStart = Date.now() - session.timeMs
      setStartTime(derivedStart)
      localStorage.setItem(`voble_startTime_${periodId}`, derivedStart.toString())
    } else {
      const now = Date.now()
      setStartTime(now)
      localStorage.setItem(`voble_startTime_${periodId}`, now.toString())
    }
  }, [periodId, session?.timeMs]) // Run once on mount or when session loads

  const shareSummary = useMemo(() => {
    // Generate a simple visual representation (like Wordle shares)
    const guessEmojis =
      gameState.gameStatus === 'won'
        ? '🟩'.repeat(gameState.guesses.length) + '⬜'.repeat(7 - gameState.guesses.length)
        : '🟥🟥🟥🟥🟥🟥🟥'

    const base =
      gameState.gameStatus === 'won'
        ? `🎯 Voble ${gameState.guesses.length}/7 | ${gameState.score.toLocaleString()} pts\n\n${guessEmojis}\n\n💰 Play for real USDC prizes on @vobleFun!`
        : `😤 Voble X/7\n\n${guessEmojis}\n\nThe word "${gameState.targetWord}" got me today!\n\n👉 Try your luck on @vobleFun`

    // Use player's referral link if available, otherwise fallback to base URL
    const shareLink = referralStats?.referralLink || 'https://voble.fun'
    return `${base}\n\n${shareLink}`
  }, [
    gameState.gameStatus,
    gameState.guesses.length,
    gameState.score,
    gameState.targetWord,
    referralStats?.referralLink,
  ])

  const isResultModalOpen =
    gameState.showResultModal && (gameState.gameStatus === 'won' || gameState.gameStatus === 'lost')

  // Check if session account exists (session will be null if account doesn't exist)
  const sessionAccountExists = session !== null
  const sessionIsCurrentPeriod = !!session?.isCurrentPeriod

  // Function to update grid from blockchain session data
  const updateGridFromSession = (sessionData?: SessionData | null) => {
    const dataToUse = sessionData || session
    if (!dataToUse) return

    const newGrid = Array(7)
      .fill(null)
      .map(() =>
        Array(6)
          .fill(null)
          .map(() => ({ letter: '', state: 'empty' as TileState })),
      )
    const newKeyboardState: Record<string, TileState> = {}

    // Update grid with guesses from blockchain
    dataToUse.guesses.forEach((guessData, rowIndex: number) => {
      // Check if guess data exists
      if (!guessData || !guessData.guess) return

      const letters = guessData.guess.split('')
      letters.forEach((letter: string, colIndex: number) => {
        const result = guessData.result[colIndex]
        let state: TileState = 'absent'

        // LetterResult is an enum: Correct=0, Present=1, Absent=2
        if (result === LetterResult.Correct) {
          state = 'correct'
          newKeyboardState[letter] = 'correct'
        } else if (result === LetterResult.Present) {
          state = 'present'
          if (newKeyboardState[letter] !== 'correct') {
            newKeyboardState[letter] = 'present'
          }
        } else {
          // LetterResult.Absent
          state = 'absent'
          if (!newKeyboardState[letter]) {
            newKeyboardState[letter] = 'absent'
          }
        }

        newGrid[rowIndex][colIndex] = { letter, state }
      })
    })

    setGameState((prev) => ({
      ...prev,
      grid: newGrid,
      currentRow: dataToUse.guessesUsed,
      currentCol: 0,
      guesses: dataToUse.guesses.filter((guess): guess is GuessEntry => !!guess).map((guess) => guess.guess),
    }))
    setKeyboardState(newKeyboardState)
  }

  // Update grid when session data changes
  useEffect(() => {
    if (session) {
      updateGridFromSession()
    }
  }, [session?.guessesUsed]) // Re-run when guesses change - session and updateGridFromSession are stable

  // Sync gameState with blockchain session on page load (for completed games)
  useEffect(() => {
    if (session?.completed && gameState.gameStatus === 'playing') {
      setGameState(prev => ({
        ...prev,
        gameStatus: session.isSolved ? 'won' : 'lost',
        targetWord: session.targetWord || prev.targetWord,
        score: session.score || prev.score,
        showResultModal: false // Don't auto-show modal for returning players
      }))
    }
  }, [session?.completed, session?.isSolved, session?.targetWord, session?.score, gameState.gameStatus])

  // Timer effect
  useEffect(() => {
    if (gameState.gameStatus === 'playing' && startTime > 0) {
      const timer = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          timeElapsed: Math.floor((Date.now() - startTime) / 1000),
        }))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [gameState.gameStatus, startTime])

  // Auto-recovery: Detect if user has paid ticket but session wasn't reset
  // This happens when buy_ticket succeeded but reset_session on TEE failed
  const [recoveryAttempted, setRecoveryAttempted] = useState(false)

  useEffect(() => {
    const attemptRecovery = async () => {
      // Only attempt once per page load
      if (recoveryAttempted || isRecovering) return

      // Conditions for auto-recovery:
      // 1. Profile exists and has lastPaidPeriod === today
      // 2. Session exists but is NOT for current period (reset never happened)
      // 3. Not already starting a game
      const hasPaidForToday = profile?.lastPaidPeriod === periodId
      const sessionNeedsReset = sessionAccountExists && !sessionIsCurrentPeriod

      if (hasPaidForToday && sessionNeedsReset && !isStartingGame) {
        console.log('[Auto-Recovery] Recovering unused ticket...')
        setRecoveryAttempted(true)

        const result = await recoverTicket(periodId)

        if (result.success) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          await refetchSession()
        } else {
          console.error('[Auto-Recovery] Failed:', result.error)
        }
      }
    }

    attemptRecovery()
  }, [
    profile?.lastPaidPeriod,
    periodId,
    sessionAccountExists,
    sessionIsCurrentPeriod,
    isStartingGame,
    recoveryAttempted,
    isRecovering,
    recoverTicket,
    refetchSession,
    session?.periodId
  ])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Validate requirements before allowing gameplay:
  // 1. Has valid ticket (paid and on-chain)
  // 2. Session exists on-chain for current period
  // 3. Purchase didn't fail (prevents showing game after cancelled tx)
  // sessionReady bypasses stale sessionIsCurrentPeriod during the purchase->gameplay transition
  const canPlayGame = (sessionIsCurrentPeriod || sessionReady) && !!session && !session.completed && session.guessesUsed < 7 && !purchaseFailed

  const handleKeyPress = async (key: string) => {
    if (!canPlayGame || gameState.gameStatus !== 'playing') return

    if (key === 'BACKSPACE') {
      if (gameState.currentCol > 0) {
        // Update UI
        const newGrid = [...gameState.grid]
        newGrid[gameState.currentRow][gameState.currentCol - 1] = {
          letter: '',
          state: 'empty',
        }
        setGameState((prev) => ({
          ...prev,
          grid: newGrid,
          currentCol: prev.currentCol - 1,
        }))
      }
    } else if (key === 'ENTER') {
      // Only submit if valid
      if (gameState.currentCol === 6) {
        submitGuess()
      }
    } else if (key.length === 1 && gameState.currentCol < 6) {
      // Update UI
      const newGrid = [...gameState.grid]
      newGrid[gameState.currentRow][gameState.currentCol] = {
        letter: key,
        state: 'filled',
      }
      setGameState((prev) => ({
        ...prev,
        grid: newGrid,
        currentCol: prev.currentCol + 1,
      }))
    }
  }

  const submitGuess = async () => {
    // Security check before submitting to blockchain
    if (!canPlayGame) {
      console.error('[Security] Attempted guess without valid session')
      alert('Error: You must have a session key and valid ticket to play.')
      return
    }

    const currentGuess = gameState.grid[gameState.currentRow].map((tile) => tile.letter).join('')

    if (currentGuess.length !== 6) return

    const guessToCheck = currentGuess.toUpperCase()
    if (!ALLOWED_WORDS.includes(guessToCheck)) {
      setErrorMsg('Not a valid word')
      setTimeout(() => setErrorMsg(null), 2000)
      return
    }

    setGameState((prev) => ({ ...prev, gameStatus: 'loading' }))

    try {
      // Submit to blockchain with period validation
      const result = await submitGuessToBlockchain(currentGuess, periodId)

      if (result.success) {
        const { data: freshSession } = await refetchSession()

        if (freshSession) {
          // Check the last guess result directly from session data
          const lastGuessIndex = freshSession.guessesUsed - 1
          const lastGuess = freshSession.guesses[lastGuessIndex]
          const allCorrect = lastGuess?.result?.every((r) => r === LetterResult.Correct)

          updateGridFromSession(freshSession)

          // Check if game ended
          if (allCorrect || freshSession.isSolved || freshSession.guessesUsed >= 7) {
            await handleCompleteGame()
          } else {
            setGameState((prev) => ({ ...prev, gameStatus: 'playing' }))
          }
        }
      } else {
        console.error('❌ Failed to submit guess:', result.error)
        setErrorMsg(result.error || 'Submission failed')
        setTimeout(() => setErrorMsg(null), 3000)
        setGameState((prev) => ({ ...prev, gameStatus: 'playing' }))
      }
    } catch (error) {
      console.error('❌ Error submitting guess:', error)
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      setErrorMsg(errMsg)
      setTimeout(() => setErrorMsg(null), 3000)
      setGameState((prev) => ({ ...prev, gameStatus: 'playing' }))
    }
  }

  const handleInitializeSession = async () => {
    const result = await initializeSession()

    if (result.success) {
      // Show success state briefly before closing dialog
      setIsSessionCreated(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Refetch to update UI (this will close the dialog)
      await refetchSession()
      setIsSessionCreated(false)
    } else {
      console.error('❌ Failed to initialize session:', result.error)
      alert(`Error: ${result.error}`)
    }
  }

  const handleBuyTicket = async () => {
    setIsStartingGame(true)
    setBuyTicketError(null) // Clear any previous error
    setPurchaseFailed(false) // Reset failed state for new attempt
    setSessionReady(false) // Reset session ready flag for new purchase
    try {
      const result = await buyTicket(periodId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to buy ticket')
      }

      // Wait for ER to sync the account
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Reset game state for new session
      setGameState({
        grid: Array(7)
          .fill(null)
          .map(() =>
            Array(6)
              .fill(null)
              .map(() => ({ letter: '', state: 'empty' })),
          ),
        currentRow: 0,
        currentCol: 0,
        gameStatus: 'playing',
        targetWord: '',
        guesses: [],
        score: 0,
        timeElapsed: 0,
        showResultModal: false,
      })
      setKeyboardState({})

      // Initialize new timer
      const now = Date.now()
      setStartTime(now)
      localStorage.setItem(`voble_startTime_${periodId}`, now.toString())

      // Poll session until it's ready for gameplay (max 3 attempts with backoff)
      // This fixes a race condition where session data wasn't synced before UI rendered
      const MAX_POLL_ATTEMPTS = 3
      const INITIAL_DELAY_MS = 1000

      for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
        const { data: newSession } = await refetchSession()

        if (newSession?.isCurrentPeriod && !newSession?.completed) {
          setSessionReady(true)
          break
        }

        if (attempt < MAX_POLL_ATTEMPTS) {
          const delay = INITIAL_DELAY_MS * attempt
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      setIsStartingGame(false)
    } catch (error: unknown) {
      const err = error as Error & { message?: string }
      console.error('❌ [handleBuyTicket] Error:', err)
      setBuyTicketError(err.message || 'An error occurred. Please try again.')
      setPurchaseFailed(true) // Mark purchase as failed to prevent game UI
      setIsStartingGame(false)
    }
  }

  const handleCompleteGame = async () => {
    setIsProcessingResult(true)
    const result = await completeGame(periodId)

    if (result.success) {
      // Wait for session to update
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const { data: updatedSession } = await refetchSession()

      // Now use the updated session data
      if (updatedSession) {
        setGameState((prev) => ({
          ...prev,
          gameStatus: updatedSession.isSolved ? 'won' : 'lost',
          score: updatedSession.score || 0,
          targetWord: updatedSession.targetWord || 'UNKNOWN',
          timeElapsed: Math.floor((updatedSession.timeMs || 0) / 1000),
          showResultModal: true,
        }))
      }
    } else {
      console.error('❌ Failed to complete game:', result.error)
      setIsProcessingResult(false)
    }
  }

  const closeResultModal = () => {
    setGameState((prev) => ({ ...prev, showResultModal: false }))
    setIsProcessingResult(false)
  }

  const handleShareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareSummary)}`
    window.open(url, '_blank')
  }

  // ============================================================================
  // UI RENDERERS

  // 1. LOADING STATE (including recovery)
  if (!ready || (authenticated && wallet && isLoadingProfile) || isRecovering) {
    return <GameLoading ready={ready} message={isRecovering ? 'Recovering your game session...' : undefined} />
  }

  // 2. CONNECT WALLET STATE
  if (!authenticated || !wallet) {
    return <ConnectWallet login={login} />
  }

  // 3. CREATE PROFILE STATE
  if (!profile) {
    return <CreateProfilePrompt />
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-[#09090b] overflow-x-hidden">
      <div className="container mx-auto py-4 sm:py-8 px-4 max-w-4xl">
        {/* 4. INITIALIZE ACCESS MODAL */}
        <InitializeSessionDialog
          open={!sessionAccountExists || isSessionCreated}
          isInitializing={isInitializing}
          isSessionCreated={isSessionCreated}
          onInitialize={handleInitializeSession}
        />

        {/* 5. MAIN GAME UI */}
        {sessionAccountExists && (
          <>
            {!isProcessingResult && !gameState.showResultModal && (
              <GameLobby
                isStartingGame={isStartingGame}
                isBuyingTicket={isBuyingTicket}
                ticketPurchased={ticketPurchased}
                vrfCompleted={vrfCompleted}
                // Show enter arena if not starting, and:
                // 1. Not current period (hasn't played today) -> Button active
                // 2. Played and completed/max-guesses -> Button disabled (via isAlreadyPlayedToday)
                // 3. Current period but not completed -> Should be playing (GameBoard shows instead)
                showEnterArena={
                  !sessionIsCurrentPeriod ||
                  !!session?.completed ||
                  (session?.guessesUsed ?? 0) >= 7
                }
                // Show prize vaults if not starting, and (not current period OR completed OR max guesses reached)
                showPrizeVaults={
                  !isStartingGame &&
                  (!sessionIsCurrentPeriod || !!session?.completed || (session?.guessesUsed ?? 0) >= 7)
                }
                isAlreadyPlayedToday={
                  sessionIsCurrentPeriod && (!!session?.completed || (session?.guessesUsed ?? 0) >= 7)
                }
                onBuyTicket={handleBuyTicket}
                error={buyTicketError}
              />
            )}

            {/* 6. GAME BOARD (Only show when playing OR processing/showing result) */}
            {((canPlayGame && !isStartingGame) || isProcessingResult || gameState.showResultModal) && (
              <div className="relative">
                <GameBoard
                  gameState={gameState}
                  keyboardState={keyboardState}
                  formatTime={formatTime}
                  handleKeyPress={handleKeyPress}
                  errorMessage={errorMsg}
                />

                {/* Processing Overlay */}
                {isProcessingResult && !gameState.showResultModal && (
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-xl animate-in fade-in duration-300">
                    <div className="h-16 w-16 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 animate-spin mb-4"></div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                      Verifying Result...
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-mono text-sm mt-2">
                      Checking game status on-chain
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* RESULT MODAL - Outside canPlayGame so it shows after game completes */}
            <GameResultModal
              isOpen={isResultModalOpen}
              onClose={closeResultModal}
              gameStatus={gameState.gameStatus}
              targetWord={gameState.targetWord}
              guessesLength={gameState.guesses.length}
              score={gameState.score}
              onShare={handleShareToTwitter}
              timeTaken={gameState.timeElapsed}
            />
          </>
        )}
      </div>
    </div>
  )
}
