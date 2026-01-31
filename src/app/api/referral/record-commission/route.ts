import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 20% of 15% platform fee = 3% of ticket price
// 1 USDC ticket = 0.03 USDC commission (30,000 smallest units)
const REFERRAL_COMMISSION_RATE = 0.20 // 20% of platform fee
const PLATFORM_FEE_RATE = 0.15 // 15% of ticket
const TICKET_PRICE_USDC = 1_000_000 // 1 USDC in smallest units

/**
 * POST /api/referral/record-commission
 *
 * Called when a referred user plays a game.
 * Records the referral commission for the referrer.
 *
 * Body: { refereeWallet: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { refereeWallet } = body

        if (!refereeWallet) {
            return NextResponse.json({ error: 'Missing refereeWallet' }, { status: 400 })
        }

        // Check if this user was referred by someone
        const { data: referral, error: referralError } = await supabaseAdmin
            .from('referrals')
            .select('referrer_wallet')
            .eq('referee_wallet', refereeWallet)
            .single()

        if (referralError || !referral) {
            // User was not referred, nothing to do
            return NextResponse.json({ recorded: false, reason: 'No referrer found' })
        }

        const referrerWallet = referral.referrer_wallet

        // Calculate commission: 20% of 15% platform fee
        // For 1 USDC ticket: 1,000,000 * 0.15 * 0.20 = 30,000 (0.03 USDC)
        const platformFee = Math.floor(TICKET_PRICE_USDC * PLATFORM_FEE_RATE)
        const commission = Math.floor(platformFee * REFERRAL_COMMISSION_RATE)

        // Record the earning
        const { error: earningError } = await supabaseAdmin.from('referral_earnings').insert({
            referrer_wallet: referrerWallet,
            referee_wallet: refereeWallet,
            referral_commission: commission,
        })

        if (earningError) {
            console.error('Failed to record referral earning:', earningError)
            return NextResponse.json({ error: 'Failed to record earning' }, { status: 500 })
        }

        // Update claimable balance (upsert)
        const { data: existingBalance } = await supabaseAdmin
            .from('referral_balances')
            .select('claimable_amount, lifetime_earnings')
            .eq('wallet', referrerWallet)
            .single()

        if (existingBalance) {
            // Update existing balance
            await supabaseAdmin
                .from('referral_balances')
                .update({
                    claimable_amount: existingBalance.claimable_amount + commission,
                    lifetime_earnings: existingBalance.lifetime_earnings + commission,
                })
                .eq('wallet', referrerWallet)
        } else {
            // Create new balance record
            await supabaseAdmin.from('referral_balances').insert({
                wallet: referrerWallet,
                claimable_amount: commission,
                lifetime_earnings: commission,
            })
        }

        console.log(
            `Recorded referral commission: ${commission} (${commission / 1_000_000} USDC) for ${referrerWallet}`,
        )

        return NextResponse.json({
            recorded: true,
            referrerWallet,
            commission,
            commissionUSDC: commission / 1_000_000,
        })
    } catch (error) {
        console.error('Error recording referral commission:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
