import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/player/rank?player=xxx
 *
 * Get player's rank and percentile based on total score.
 */
export async function GET(request: NextRequest) {
  try {
    const player = request.nextUrl.searchParams.get('player')

    if (!player) {
      return NextResponse.json({ error: 'Missing player parameter' }, { status: 400 })
    }

    // Get total player count
    const { count: totalPlayers } = await supabaseAdmin.from('player_stats').select('*', { count: 'exact', head: true })

    // Get players with higher score than current player
    const { data: playerStats } = await supabaseAdmin
      .from('player_stats')
      .select('total_score')
      .eq('player', player)
      .single()

    if (!playerStats) {
      return NextResponse.json({
        rank: null,
        totalPlayers: totalPlayers || 0,
        percentile: null,
      })
    }

    // Count players with higher score
    const { count: playersAbove } = await supabaseAdmin
      .from('player_stats')
      .select('*', { count: 'exact', head: true })
      .gt('total_score', playerStats.total_score)

    const rank = (playersAbove || 0) + 1
    const percentile = totalPlayers && totalPlayers > 0 ? Math.round((1 - (rank - 1) / totalPlayers) * 100) : 100

    return NextResponse.json({
      rank,
      totalPlayers: totalPlayers || 0,
      percentile: Math.max(1, Math.min(100, percentile)), // Clamp between 1-100
    })
  } catch (error) {
    console.error('Error fetching player rank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
