import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Generate a random 7-character alphanumeric referral code
 * Uses uppercase letters and numbers for readability (e.g., A3X7K9P)
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluded I, O, 0, 1 for readability
  let code = ''
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Auto-generate a referral code for a wallet if one doesn't exist.
 * Returns the code (existing or newly created).
 */
async function ensureReferralCode(wallet: string): Promise<string | null> {
  // First, check if code already exists
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('referral_codes')
    .select('code')
    .eq('owner_wallet', wallet)
    .single()

  if (existing?.code) {
    return existing.code
  }

  // If no code exists, generate one with retry logic for uniqueness
  let code = generateReferralCode()
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    const { error } = await supabaseAdmin.from('referral_codes').insert({
      code,
      owner_wallet: wallet,
    })

    if (!error) {
      return code
    }

    // If code already exists (unique constraint), generate a new one
    if (error.code === '23505') {
      code = generateReferralCode()
      attempts++
    } else {
      console.error('[Referral Stats] Failed to auto-generate code:', error)
      return null
    }
  }

  console.error('[Referral Stats] Failed to generate unique code after max attempts')
  return null
}

/**
 * GET /api/referral/stats?wallet=XXX
 *
 * Get referral statistics for a wallet address.
 * Auto-generates a referral code if one doesn't exist.
 * Returns earnings, referral count, and claimable amount.
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    // Ensure referral code exists (auto-generate if needed)
    const code = await ensureReferralCode(wallet)

    // Get referral count
    const { count: referralCount } = await supabaseAdmin
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_wallet', wallet)

    // Get balance
    const { data: balanceData } = await supabaseAdmin
      .from('referral_balances')
      .select('claimable_amount, lifetime_earnings, last_claimed_at')
      .eq('wallet', wallet)
      .single()

    // Get recent earnings
    const { data: recentEarnings } = await supabaseAdmin
      .from('referral_earnings')
      .select('referee_wallet, referral_commission, created_at')
      .eq('referrer_wallet', wallet)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      code: code || null,
      referralLink: code ? `https://voble.fun/ref/${code}` : null,
      referralCount: referralCount || 0,
      claimableAmount: balanceData?.claimable_amount || 0,
      lifetimeEarnings: balanceData?.lifetime_earnings || 0,
      lastClaimedAt: balanceData?.last_claimed_at || null,
      recentEarnings: recentEarnings || [],
    })
  } catch (error) {
    console.error('Error fetching referral stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
