import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/leaderboard?period=daily|weekly|monthly&period_id=YYYY-MM-DD
 *
 * Fetch leaderboard rankings from database.
 * - Daily: Returns single best score per player for the period
 * - Weekly/Monthly: Returns cumulative scores across all games in the period
 */
export async function GET(request: NextRequest) {
  try {
    const periodType = request.nextUrl.searchParams.get('period') || 'daily'
    const periodIdParam = request.nextUrl.searchParams.get('period_id')

    // Calculate current period ID if not provided
    const periodId = periodIdParam || getCurrentPeriodId(periodType)

    let entries
    let totalPlayers = 0

    if (periodType === 'daily') {
      // Daily: Single best score per player (one game per day)
      const { data, error, count } = await supabaseAdmin
        .from('game_history')
        .select('player, score, guesses_used, time_ms, created_at', { count: 'exact' })
        .eq('period_id', periodId)
        .order('score', { ascending: false })
        .order('guesses_used', { ascending: true })
        .order('time_ms', { ascending: true })
        .limit(100)

      if (error) {
        console.error('Failed to fetch daily leaderboard:', error)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
      }

      entries = data || []
      totalPlayers = count || 0
    } else {
      // Weekly/Monthly: Aggregate scores per player across all games in period
      const periodFilter = periodType === 'weekly' ? getWeekDates(periodId) : getMonthDates(periodId)

      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('game_history')
        .select('player, score')
        .gte('period_id', periodFilter.start)
        .lte('period_id', periodFilter.end)

      if (fallbackError) {
        console.error('Query failed:', fallbackError)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
      }

      // Aggregate manually
      const playerScores = new Map<string, { totalScore: number; gamesPlayed: number }>()
      for (const game of fallbackData || []) {
        const existing = playerScores.get(game.player) || { totalScore: 0, gamesPlayed: 0 }
        playerScores.set(game.player, {
          totalScore: existing.totalScore + game.score,
          gamesPlayed: existing.gamesPlayed + 1,
        })
      }

      entries = Array.from(playerScores.entries())
        .map(([player, { totalScore, gamesPlayed }]) => ({
          player,
          score: totalScore,
          games_played: gamesPlayed,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 100)

      totalPlayers = playerScores.size
    }

    // Fetch usernames from player_stats (synced from on-chain profiles)
    const playerAddresses = entries.map((e: { player: string }) => e.player)
    const { data: playerStats } = await supabaseAdmin
      .from('player_stats')
      .select('player, username')
      .in('player', playerAddresses)

    const usernameMap = new Map(
      (playerStats || []).map((p: { player: string; username: string | null }) => [p.player, p.username]),
    )

    // Format response
    const formattedEntries = entries.map(
      (
        entry: { player: string; score: number; guesses_used?: number; time_ms?: number; games_played?: number },
        index: number,
      ) => ({
        rank: index + 1,
        player: entry.player,
        username: usernameMap.get(entry.player) || null,
        score: entry.score,
        guessesUsed: entry.guesses_used || 0,
        timeMs: entry.time_ms || 0,
        gamesPlayed: entry.games_played || 1,
      }),
    )

    return NextResponse.json({
      entries: formattedEntries,
      totalPlayers,
      periodId,
      periodType,
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Epoch-based period constants (matching smart contract)
const PERIOD_EPOCH_START = 1704038400 // January 1, 2024 00:00:00 UTC+8 (seconds)
const PERIOD_WEEKLY_DURATION = 7 * 24 * 60 * 60 // 604800 seconds

// Helper: Get current period ID based on type
function getCurrentPeriodId(periodType: string): string {
  const now = new Date()
  const utc8TimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' })
  const nowUtc8 = new Date(utc8TimeStr)

  if (periodType === 'daily') {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Singapore',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(now)
  } else if (periodType === 'weekly') {
    // Epoch-based calculation matching smart contract
    const nowUnixSeconds = Math.floor(nowUtc8.getTime() / 1000)
    const elapsedSeconds = nowUnixSeconds - PERIOD_EPOCH_START
    const weekNumber = Math.floor(elapsedSeconds / PERIOD_WEEKLY_DURATION)
    return `W${weekNumber}`
  } else {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Singapore',
      year: 'numeric',
      month: '2-digit',
    })
    return formatter.format(now).slice(0, 7)
  }
}

// Helper: Get date range for a week period (epoch-based format: "W108")
function getWeekDates(weekPeriodId: string): { start: string; end: string } {
  // Parse epoch-based period ID (e.g., "W108")
  const weekNum = parseInt(weekPeriodId.replace('W', ''))

  // Calculate start timestamp: epoch + (weekNum * week_duration)
  const startTimestamp = PERIOD_EPOCH_START + weekNum * PERIOD_WEEKLY_DURATION
  const endTimestamp = startTimestamp + PERIOD_WEEKLY_DURATION - 1 // End of the week

  // Convert to dates (timestamps are in seconds, need milliseconds)
  const startDate = new Date(startTimestamp * 1000)
  const endDate = new Date(endTimestamp * 1000)

  // Format as YYYY-MM-DD for database query
  const format = (d: Date) => {
    // Use UTC+8 timezone for formatting
    const utc8Str = d.toLocaleString('en-CA', { timeZone: 'Asia/Singapore' })
    return utc8Str.split(',')[0] // Returns YYYY-MM-DD
  }

  return { start: format(startDate), end: format(endDate) }
}

// Helper: Get date range for a month period
function getMonthDates(monthPeriodId: string): { start: string; end: string } {
  // Parse YYYY-MM format
  const [year, month] = monthPeriodId.split('-').map(Number)

  // Create dates in UTC to avoid timezone issues
  // Start: First day of the month
  const startDate = new Date(Date.UTC(year, month - 1, 1))
  // End: Last day of the month
  const endDate = new Date(Date.UTC(year, month, 0))

  // Format as YYYY-MM-DD (already in UTC so no timezone conversion needed)
  const format = (d: Date) => d.toISOString().split('T')[0]
  return { start: format(startDate), end: format(endDate) }
}
