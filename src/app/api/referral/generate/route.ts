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
 * POST /api/referral/generate
 *
 * Generate a referral code for a wallet if one doesn't exist.
 *
 * Body: { wallet: string }
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_KEY) {
      console.error('Missing SUPABASE_SERVICE_KEY')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const body = await request.json()
    const { wallet } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    // Check if code already exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('referral_codes')
      .select('code')
      .eq('owner_wallet', wallet)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "no rows found"
      console.error('[Referral Generate] Error checking existing:', fetchError)
      // Verify table existence - code 42P01 is undefined_table
      if (fetchError.code === '42P01') {
        return NextResponse.json({ error: 'Database table "referral_codes" not found' }, { status: 500 })
      }
    }

    if (existing) {
      return NextResponse.json({
        code: existing.code,
        referralLink: `https://voble.fun/ref/${existing.code}`,
        created: false,
      })
    }

    // Generate new code with retry logic for uniqueness
    let code = generateReferralCode()
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      const { error } = await supabaseAdmin.from('referral_codes').insert({
        code,
        owner_wallet: wallet,
      })

      if (!error) {
        return NextResponse.json({
          code,
          referralLink: `https://voble.fun/ref/${code}`,
          created: true,
        })
      }

      // If code already exists, generate a new one
      if (error.code === '23505') {
        code = generateReferralCode()
        attempts++
      } else {
        console.error('[Referral Generate] Insert failed:', error)
        const msg = error.message || 'Unknown database error'
        return NextResponse.json({ error: `Failed to create referral code: ${msg}` }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Failed to generate unique code' }, { status: 500 })
  } catch (error: any) {
    console.error('[Referral Generate] Crash:', error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
