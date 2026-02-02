'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import {
  useSubmitGuess,
  useCompleteGame,
  useFetchSession,
  useUserProfile,
  useGameMachine,
  SessionData,
  LetterResult,
} from '@/hooks'
import { useReferralStats } from '@/hooks/use-referral-stats'
import { getCurrentDayPeriodId } from '@/lib/periods'
import { useInitializeSession } from '@/hooks/use-initialize-session'

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

  // State machine hook - replaces scattered boolean flags
  const {
    phase,
    error: gameError,
    startTime,
    isStartingGame,
    ticketPurchased,
    vrfCompleted,
    startGame,
    setPhase,
  } = useGameMachine(periodId)

  const { submitGuess: submitGuessToBlockchain } = useSubmitGuess()
  const { completeGame } = useCompleteGame()
  const { session, refetch: refetchSession } = useFetchSession(periodId)
  const { initializeSession, isLoading: isInitializing } = useInitializeSession()

  const { profile, isLoading: isLoadingProfile } = useUserProfile(wallet?.address)
  const { data: referralStats } = useReferralStats()

  // isRecovering derived from phase
  const isRecovering = phase === 'recovering'

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
  const [isProcessingResult, setIsProcessingResult] = useState(false)
  const [isSessionCreated, setIsSessionCreated] = useState(false)

  // Timer initialization is now handled by useGameMachine

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

  // Timer effect - now uses phase from state machine
  useEffect(() => {
    if (phase === 'playing' && startTime > 0) {
      const timer = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          timeElapsed: Math.floor((Date.now() - startTime) / 1000),
        }))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [phase, startTime])

  // Auto-recovery is now handled by useGameMachine

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Simplified gameplay validation - uses phase from state machine
  const canPlayGame = (phase === 'playing' || phase === 'submitting') && !!session && !session.completed && session.guessesUsed < 7

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

    // Delegate to state machine
    await startGame()
  }

  const handleCompleteGame = async () => {
    setIsProcessingResult(true)
    setPhase('completing')
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
        setPhase('result')
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
                isBuyingTicket={phase === 'buying'}
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
                error={gameError}
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
