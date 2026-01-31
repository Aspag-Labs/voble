/**
 * Hook to fetch game history from Supabase database
 *
 * This fetches data from the database (indexed from blockchain)
 * instead of directly from the blockchain.
 */

import { useState, useEffect, useCallback } from 'react'
import { useWallets } from '@privy-io/react-auth/solana'

export interface GameHistoryItem {
  id: number
  player: string
  period_id: string
  target_word: string | null
  guesses: any[]
  score: number
  guesses_used: number
  time_ms: number
  is_won: boolean
  created_at: string
}

export interface PlayerStatsFromDB {
  player: string
  username: string | null
  total_games: number
  games_won: number
  total_score: number
  best_score: number
  average_guesses: number
  guess_distribution: number[]
}

export function useGameHistory() {
  const { wallets } = useWallets()
  const wallet = wallets[0]

  const [games, setGames] = useState<GameHistoryItem[]>([])
  const [stats, setStats] = useState<PlayerStatsFromDB | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!wallet?.address) {
      setGames([])
      setStats(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        player: wallet.address,
        limit: '20',
        offset: '0',
      })

      const response = await fetch(`/api/game/history?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch history')
      }

      setGames(data.games || [])
      setStats(data.stats || null)
    } catch (err: unknown) {
      const typedErr = err as Error & { message?: string }
      console.error('❌ [useGameHistory] Error:', typedErr.message)
      setError(typedErr.message || 'Unknown error')
      setGames([])
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [wallet?.address])

  // Fetch on mount and when wallet changes
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    games,
    stats,
    isLoading,
    error,
    refetch: fetchHistory,
  }
}
