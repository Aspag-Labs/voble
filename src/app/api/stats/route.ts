import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('prize_claims').select('amount')

    if (error) {
      console.error('Error fetching prize claims for stats:', error)
      return NextResponse.json(
        {
          totalPlayers: 0,
          totalPrizeClaimedLamports: 0,
          error: 'Failed to fetch prize data',
        },
        { status: 500 },
      )
    }

    const totalPrizeClaimedLamports = (data || []).reduce((sum, claim) => {
      // Handle potnetial string/number types
      return sum + Number(claim.amount)
    }, 0)

    // We also need total players count (unique wallet addresses that have played?)
    // The previous implementation used getProgramAccounts to count user profiles.
    // Ideally we keep that logic in the frontend or move it here.
    // The frontend called /api/rpc for getProgramAccounts to count players.
    // The previous code in page.tsx:
    // const accounts = data.result || []
    // return { totalPlayers: accounts.length ... }

    // The frontend fetches totalPlayers from /api/rpc call which is separate or via the same useQuery.
    // In `src/app/stats/page.tsx`, `useQuery` calls `/api/rpc`.
    // We want to REPLACE that or AUGMENT it.
    // The frontend `protocolStatsQuery` currently fetches from `/api/rpc`.

    // The most efficient way is to let the frontend keep fetching totalPlayers from RPC (as that's on-chain data)
    // AND fetch prize data from this new endpoint?
    // OR we can make this endpoint return both if we can fetch player count from DB (which is synced).

    // `player_stats` table in Supabase seems to track players.
    // Let's check player count from DB for faster access than RPC?

    const { count: totalPlayers, error: playersError } = await supabaseAdmin
      .from('player_stats')
      .select('*', { count: 'exact', head: true })

    if (playersError) {
      console.error('Error counting players', playersError)
    }

    return NextResponse.json({
      totalPlayers: totalPlayers || 0,
      totalPrizeClaimedLamports,
    })
  } catch (error) {
    console.error('Internal server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
