import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch all prize claims
    const { data: claims, error } = await supabaseAdmin.from('prize_claims').select('player, amount')

    if (error) {
      console.error('Error fetching prize claims for top earners:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    // Aggregate rankings in memory
    const earningsMap = new Map<string, number>()

    for (const claim of claims || []) {
      const currentAmount = earningsMap.get(claim.player) || 0
      // amount is in lamports/atomic units (integer)
      earningsMap.set(claim.player, currentAmount + Number(claim.amount))
    }

    // Sort by total earnings (descending) and take top 10
    const topEarners = Array.from(earningsMap.entries())
      .map(([player, totalEarned]) => ({ player, totalEarned }))
      .sort((a, b) => b.totalEarned - a.totalEarned)
      .slice(0, 10)

    if (topEarners.length === 0) {
      return NextResponse.json([])
    }

    // Fetch usernames for these top players
    const players = topEarners.map((e) => e.player)
    const { data: profiles } = await supabaseAdmin.from('player_stats').select('player, username').in('player', players)

    // Create a map for quick username lookup
    const usernameMap = new Map<string, string | null>()
    if (profiles) {
      for (const profile of profiles) {
        usernameMap.set(profile.player, profile.username)
      }
    }

    // Combine data
    const result = topEarners.map((earner) => ({
      player: earner.player,
      username: usernameMap.get(earner.player) || null,
      totalEarned: earner.totalEarned / 1_000_000, // Convert lamports to USDC (assuming 6 decimals)
      // Wait, USDC has 6 decimals.
      // If the prize claims store value in the token's atomic units, likely USDC (6 decimals).
      // The frontend page divides by 1,000,000 for totalPrizeClaimedUSDC calculation.
      // So returning raw lamports/atomic units or converted units?
      // Page currently expects "totalPrizeClaimedLamports" from stats endpoint and divides by 1_000_000 lines 94.

      // But for top earners query in page.tsx:
      // return [] as { player: string; username: string; totalEarned: number }[]
      // And renders: {formatUSDC(earner.totalEarned)} line 275.
      // formatUSDC uses .toFixed(2).

      // So I should return the value in USDC (not atomic units) OR return atomic and let frontend format.
      // The current frontend code `formatUSDC` takes specific number.
      // If I return USDC directly here it's easier.
    }))

    // Actually, looking at page.tsx line 275: formatUSDC(earner.totalEarned)
    // formatUSDC implementation: const formatUSDC = (amount: number, digits = 2) => `$${amount.toFixed(digits)}`
    // So it expects the value in standard units (dollars), not atomic.

    // So yes, dividing by 1_000_000 is correct if the database stores atomic units (u64).

    return NextResponse.json(result)
  } catch (error) {
    console.error('Internal server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
