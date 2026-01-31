import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  createSolanaRpc,
  address,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  sendTransactionWithoutConfirmingFactory,
  getSignatureFromTransaction,
  createKeyPairSignerFromBytes,
} from '@solana/kit'
import { getWithdrawReferralPayoutInstructionAsync, VOBLE_PROGRAM_ADDRESS } from '@clients/js/src/generated'

// USDC Mint
const USDC_MINT = address(process.env.NEXT_PUBLIC_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

// Minimum claimable amount (in USDC smallest units - 5 USDC)
const MIN_CLAIM_AMOUNT = 5_000_000n // 5 USDC

/**
 * POST /api/referral/claim
 *
 * Claim referral earnings by calling the on-chain withdraw_referral_payout instruction.
 * Pays from Platform Vault directly to the referrer.
 *
 * Body: { wallet: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    // Check admin wallet is configured (program authority)
    const adminPrivateKey = process.env.WALLET_PRIVATE_KEY
    if (!adminPrivateKey) {
      console.error('❌ WALLET_PRIVATE_KEY not configured')
      return NextResponse.json({ error: 'Claim service not configured' }, { status: 500 })
    }

    // Get claimable balance
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from('referral_balances')
      .select('claimable_amount')
      .eq('wallet', wallet)
      .single()

    if (balanceError || !balanceData) {
      return NextResponse.json({ error: 'No claimable balance found' }, { status: 400 })
    }

    const claimableAmount = BigInt(balanceData.claimable_amount)

    if (claimableAmount < MIN_CLAIM_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum claim amount is $${Number(MIN_CLAIM_AMOUNT / 1_000_000n).toFixed(2)} USDC` },
        { status: 400 },
      )
    }

    // Initialize RPC
    const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com'
    const rpc = createSolanaRpc(rpcUrl)

    // Parse admin keypair
    let adminKeypairBytes: Uint8Array
    try {
      const privateKeyArray = JSON.parse(adminPrivateKey)
      adminKeypairBytes = Uint8Array.from(privateKeyArray)
    } catch {
      console.error('❌ Invalid admin wallet private key format')
      return NextResponse.json({ error: 'Admin wallet configuration error' }, { status: 500 })
    }

    const adminSigner = await createKeyPairSignerFromBytes(adminKeypairBytes)
    const referrerAddress = address(wallet)

    // Build the withdraw_referral_payout instruction using generated client
    const withdrawReferralPayoutIx = await getWithdrawReferralPayoutInstructionAsync({
      authority: adminSigner,
      referrer: referrerAddress,
      usdcMint: USDC_MINT,
      program: VOBLE_PROGRAM_ADDRESS,
      amount: claimableAmount,
    })

    // Get latest blockhash
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

    // Build and sign transaction
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(adminSigner, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx) => appendTransactionMessageInstructions([withdrawReferralPayoutIx], tx),
    )

    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

    // Send transaction
    const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc })
    await sendTransaction(signedTransaction, { commitment: 'confirmed' })
    const signature = getSignatureFromTransaction(signedTransaction)

    // Poll for confirmation
    let confirmed = false
    for (let i = 0; i < 30; i++) {
      const { value: statuses } = await rpc.getSignatureStatuses([signature]).send()
      if (statuses[0]?.confirmationStatus === 'confirmed' || statuses[0]?.confirmationStatus === 'finalized') {
        confirmed = true
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    if (!confirmed) {
      console.error('❌ Transaction not confirmed in time')
      return NextResponse.json(
        { error: 'Transaction sent but not confirmed. Please check your wallet.' },
        { status: 500 },
      )
    }

    // Update database - reset claimable amount
    await supabaseAdmin
      .from('referral_balances')
      .update({
        claimable_amount: 0,
        last_claimed_at: new Date().toISOString(),
      })
      .eq('wallet', wallet)

    console.log(`✅ Referral payout: ${Number(claimableAmount) / 1_000_000} USDC to ${wallet}`)

    return NextResponse.json({
      success: true,
      signature,
      amount: Number(claimableAmount),
      amountUSDC: Number(claimableAmount) / 1_000_000,
    })
  } catch (error) {
    console.error('Error processing claim:', error)
    return NextResponse.json({ error: 'Failed to process claim' }, { status: 500 })
  }
}
