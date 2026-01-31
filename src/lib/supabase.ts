import { createClient } from '@supabase/supabase-js'

// Client for frontend (uses publishable key, respects RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
)

// Admin client for backend API routes (bypasses RLS)
export const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Database types for type safety
export interface GameHistory {
  id: number
  player: string
  period_id: string
  target_word: string | null
  guesses: GuessData[]
  score: number
  guesses_used: number
  time_ms: number
  is_won: boolean
  created_at: string
}

export interface GuessData {
  guess: string
  result: LetterResult[]
  timestamp: number
}

export type LetterResult = 'correct' | 'present' | 'absent'

export interface ActiveSession {
  session_id: string
  player: string
  word_index: number
  vrf_randomness: string | null
  guesses: GuessData[]
  started_at: string
  expires_at: string
}

export interface PlayerStats {
  player: string
  username: string | null
  total_games: number
  games_won: number
  total_score: number
  best_score: number
  average_guesses: number
  guess_distribution: number[]
  created_at: string
  updated_at: string
}
