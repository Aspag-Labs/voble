'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useWallets } from '@privy-io/react-auth/solana'
import { useBuyTicket } from './use-buy-ticket'
import { useFetchSession } from './use-fetch-session'
import { useRecoverTicket } from './use-recover-ticket'
import { useUserProfile } from './use-user-profile'

/**
 * Game phases representing the complete lifecycle of a game session.
 * This replaces 9+ scattered boolean flags with a single source of truth.
 */
export type GamePhase =
    | 'idle'        // Lobby, waiting for user action
    | 'recovering'  // Auto-recovery for unused tickets (paid but reset failed)
    | 'preflight'   // Checking leaderboards, TEE simulation
    | 'buying'      // Wallet popup, awaiting TX confirmation
    | 'resetting'   // TEE reset_session in progress
    | 'syncing'     // Polling for session to be ready
    | 'playing'     // Active gameplay - timer runs here
    | 'submitting'  // Guess submitted to blockchain
    | 'completing'  // Calling complete_game instruction
    | 'result'      // Result modal displayed
    | 'error'       // Error state with retry option

export interface GameMachineState {
    phase: GamePhase
    error: string | null
    startTime: number
}

export interface UseGameMachineReturn {
    phase: GamePhase
    error: string | null
    startTime: number
    // Derived states for UI compatibility
    isStartingGame: boolean
    ticketPurchased: boolean
    vrfCompleted: boolean
    // Actions
    startGame: () => Promise<void>
    setPhase: (phase: GamePhase) => void
    setError: (error: string | null) => void
    setStartTimeNow: () => void
    retry: () => void
}

const STORAGE_KEY_PREFIX = 'voble_startTime_'

export function useGameMachine(periodId: string): UseGameMachineReturn {
    const { wallets } = useWallets()
    const wallet = wallets[0]

    const { buyTicket, ticketPurchased: hookTicketPurchased, vrfCompleted: hookVrfCompleted } = useBuyTicket()
    const { session, refetch: refetchSession } = useFetchSession(periodId)
    const { recoverTicket, isRecovering } = useRecoverTicket()
    const { profile } = useUserProfile(wallet?.address)

    const [state, setState] = useState<GameMachineState>({
        phase: 'idle',
        error: null,
        startTime: 0,
    })

    // Use ref to track if auto-recovery has been attempted
    const recoveryAttemptedRef = useRef(false)

    // ===== CALLBACKS FIRST (before effects that use them) =====

    const transition = useCallback((newPhase: GamePhase, errorMsg?: string) => {
        console.log(`[GameMachine] → ${newPhase}${errorMsg ? ` (error: ${errorMsg})` : ''}`)
        setState((prev: GameMachineState) => ({
            ...prev,
            phase: newPhase,
            error: errorMsg || (newPhase === 'error' ? prev.error : null),
        }))
    }, [])

    const setStartTimeNow = useCallback(() => {
        const now = Date.now()
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${periodId}`, now.toString())
        setState((prev: GameMachineState) => ({ ...prev, startTime: now }))
    }, [periodId])

    const retry = useCallback(() => {
        setState({
            phase: 'idle',
            error: null,
            startTime: 0,
        })
        recoveryAttemptedRef.current = false
    }, [])

    const setPhase = useCallback((phase: GamePhase) => {
        transition(phase)
    }, [transition])

    const setError = useCallback((error: string | null) => {
        setState((prev: GameMachineState) => ({ ...prev, error }))
    }, [])

    // ===== EFFECTS (after callbacks) =====

    // Initialize startTime from localStorage on mount
    useEffect(() => {
        const savedStartTime = localStorage.getItem(`${STORAGE_KEY_PREFIX}${periodId}`)
        if (savedStartTime) {
            setState((prev: GameMachineState) => ({ ...prev, startTime: parseInt(savedStartTime) }))
        }
    }, [periodId])

    // Auto-recovery check: detect paid ticket but failed reset
    useEffect(() => {
        const attemptRecovery = async () => {
            // Only attempt once per page load, when idle, and not already recovering
            if (recoveryAttemptedRef.current || state.phase !== 'idle' || isRecovering) return

            const hasPaidForToday = profile?.lastPaidPeriod === periodId
            const sessionExists = session !== null
            const sessionNotCurrent = !session?.isCurrentPeriod

            if (hasPaidForToday && sessionExists && sessionNotCurrent) {
                recoveryAttemptedRef.current = true
                console.log('[GameMachine] Auto-recovery: detecting unused ticket...')
                transition('recovering')

                const result = await recoverTicket(periodId)
                if (result.success) {
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    await refetchSession()
                    setStartTimeNow()
                    transition('playing')
                } else {
                    console.error('[GameMachine] Recovery failed:', result.error)
                    transition('error', result.error || 'Failed to recover game session')
                }
            }
        }

        attemptRecovery()
    }, [profile?.lastPaidPeriod, periodId, session?.isCurrentPeriod, state.phase, isRecovering, transition, recoverTicket, refetchSession, setStartTimeNow, session])

    // Check if we should restore to playing state (page refresh during game)
    useEffect(() => {
        if (state.phase === 'idle' && session?.isCurrentPeriod && !session?.completed) {
            console.log('[GameMachine] Restoring to playing state from session')
            transition('playing')
            // Restore timer if we have a saved start time
            const savedStartTime = localStorage.getItem(`${STORAGE_KEY_PREFIX}${periodId}`)
            if (savedStartTime) {
                setState((prev: GameMachineState) => ({ ...prev, startTime: parseInt(savedStartTime) }))
            } else if (session?.timeMs) {
                // Derive from session
                const derivedStart = Date.now() - session.timeMs
                setState((prev: GameMachineState) => ({ ...prev, startTime: derivedStart }))
                localStorage.setItem(`${STORAGE_KEY_PREFIX}${periodId}`, derivedStart.toString())
            }
        }
    }, [session?.isCurrentPeriod, session?.completed, periodId, state.phase, transition, session?.timeMs])

    // ===== MAIN ACTION =====

    const startGame = useCallback(async () => {
        try {
            // Phase 1: Preflight (leaderboard checks, TEE simulation)
            transition('preflight')

            // Phase 2: Buying ticket
            transition('buying')
            const result = await buyTicket(periodId)

            if (!result.success) {
                throw new Error(result.error || 'Failed to buy ticket')
            }

            // Phase 3: TEE resetting (handled inside buyTicket hook)
            transition('resetting')

            // Phase 4: Syncing session
            transition('syncing')

            // Poll for session ready with exponential backoff
            const MAX_POLL_ATTEMPTS = 12
            let sessionReady = false

            for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
                // Wait before polling (exponential backoff: 1s, 2s, 3s, 4s, 5s, 5s...)
                const waitTime = Math.min(attempt * 1000, 5000)
                await new Promise(resolve => setTimeout(resolve, waitTime))

                const { data: newSession } = await refetchSession()

                if (newSession?.isCurrentPeriod && !newSession?.completed) {
                    sessionReady = true
                    break
                }
            }

            // Only transition to playing if session is confirmed ready
            if (!sessionReady) {
                throw new Error('Game session failed to sync. Please refresh and try again.')
            }

            // Ensure React Query cache is fully updated before transitioning
            // This small delay allows the component to re-render with the updated session
            await new Promise(resolve => setTimeout(resolve, 500))
            await refetchSession()

            // Phase 5: Playing - set timer and transition (only reached when session is ready)
            setStartTimeNow()
            transition('playing')

        } catch (err: unknown) {
            const error = err as Error & { message?: string }
            console.error('[GameMachine] startGame error:', error)
            transition('error', error.message || 'An error occurred. Please try again.')
        }
    }, [periodId, buyTicket, refetchSession, transition, setStartTimeNow])

    // ===== DERIVED STATES =====

    const isStartingGame = ['preflight', 'buying', 'resetting', 'syncing', 'recovering'].includes(state.phase)
    const ticketPurchased = hookTicketPurchased || ['resetting', 'syncing', 'playing', 'submitting', 'completing', 'result'].includes(state.phase)
    const vrfCompleted = hookVrfCompleted || ['syncing', 'playing', 'submitting', 'completing', 'result'].includes(state.phase)

    return {
        phase: state.phase,
        error: state.error,
        startTime: state.startTime,
        isStartingGame,
        ticketPurchased,
        vrfCompleted,
        startGame,
        setPhase,
        setError,
        setStartTimeNow,
        retry,
    }
}
