import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/game/history?player=xxx
 *
 * Fetch game history for a player.
 * Returns completed games with scores, guesses, and results.
 */
export async function GET(request: NextRequest) {
  try {
    const player = request.nextUrl.searchParams.get('player')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10')
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0')

    if (!player) {
      return NextResponse.json({ error: 'Missing player parameter' }, { status: 400 })
    }

    // Fetch game history
    const {
      data: games,
      error,
      count,
    } = await supabaseAdmin
      .from('game_history')
      .select('*', { count: 'exact' })
      .eq('player', player)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Failed to fetch game history:', error)
      return NextResponse.json({ error: 'Failed to fetch game history' }, { status: 500 })
    }

    // Fetch player stats
    const { data: stats } = await supabaseAdmin.from('player_stats').select('*').eq('player', player).single()

    return NextResponse.json({
      games: games || [],
      totalGames: count || 0,
      stats: stats || null,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    })
  } catch (error) {
    console.error('Error fetching game history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
