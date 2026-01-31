import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/referral/link
 *
 * Record a referral when a new user signs up via a referral link.
 * Called after profile creation if the user came through a referral link.
 *
 * Body: { refereeWallet: string, referralCode: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refereeWallet, referralCode } = body

    if (!refereeWallet || !referralCode) {
      return NextResponse.json({ error: 'Missing refereeWallet or referralCode' }, { status: 400 })
    }

    // Look up the referrer by code
    const { data: referrerData, error: lookupError } = await supabaseAdmin
      .from('referral_codes')
      .select('owner_wallet')
      .eq('code', referralCode)
      .single()

    if (lookupError || !referrerData) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
    }

    const referrerWallet = referrerData.owner_wallet

    // Prevent self-referral
    if (referrerWallet === refereeWallet) {
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })
    }

    // Create the referral relationship
    const { error: insertError } = await supabaseAdmin.from('referrals').insert({
      referrer_wallet: referrerWallet,
      referee_wallet: refereeWallet,
    })

    if (insertError) {
      // If unique violation, user was already referred
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'User already has a referrer' }, { status: 400 })
      }
      console.error('Failed to create referral:', insertError)
      return NextResponse.json({ error: 'Failed to record referral' }, { status: 500 })
    }

    // Initialize balance for referrer if not exists
    await supabaseAdmin.from('referral_balances').upsert(
      {
        wallet: referrerWallet,
        claimable_amount: 0,
        lifetime_earnings: 0,
      },
      { onConflict: 'wallet' },
    )

    return NextResponse.json({
      success: true,
      referrer: referrerWallet,
    })
  } catch (error) {
    console.error('Error recording referral:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
