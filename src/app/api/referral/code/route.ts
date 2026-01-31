import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/referral/code?wallet=XXX
 *
 * Get the referral code for a wallet address.
 * Returns the code if exists, or null if not found.
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('referral_codes')
      .select('code, created_at')
      .eq('owner_wallet', wallet)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error('Error fetching referral code:', error)
      return NextResponse.json({ error: 'Failed to fetch referral code' }, { status: 500 })
    }

    return NextResponse.json({
      code: data?.code || null,
      referralLink: data?.code ? `https://voble.fun/ref/${data.code}` : null,
      createdAt: data?.created_at || null,
    })
  } catch (error) {
    console.error('Error in referral code endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
