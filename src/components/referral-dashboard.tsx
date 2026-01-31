'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Copy, Check, Coins } from 'lucide-react'
import { useReferralStats, useGenerateReferralCode } from '@/hooks/use-referral-stats'
import { useWallets } from '@privy-io/react-auth/solana'

interface ReferralDashboardProps {
  embedded?: boolean
}

export function ReferralDashboard({ embedded = false }: ReferralDashboardProps) {
  const { data: stats, isLoading, error, refetch } = useReferralStats()
  const { generateCode } = useGenerateReferralCode()
  const { wallets } = useWallets()
  const wallet = wallets[0]

  const [copied, setCopied] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [claimMessage, setClaimMessage] = useState<string | null>(null)

  const handleCopyLink = async () => {
    if (!stats?.referralLink) return
    await navigator.clipboard.writeText(stats.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setClaimMessage(null)
    try {
      await generateCode()
      await refetch()
    } catch (err: any) {
      console.error('Failed to generate code:', err)
      setClaimMessage(err.message || 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClaim = async () => {
    if (!wallet?.address || !stats?.claimableAmount) return

    setIsClaiming(true)
    setClaimMessage(null)

    try {
      const response = await fetch('/api/referral/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.address }),
      })

      const data = await response.json()

      if (response.ok) {
        setClaimMessage(`Claimed $${data.amountUSDC.toFixed(2)}!`)
        await refetch()
      } else {
        setClaimMessage(data.error || 'Failed')
      }
    } catch (err) {
      console.error('Claim error:', err)
      setClaimMessage('Failed')
    }

    setIsClaiming(false)
  }

  const formatUSDC = (amount: number) => (amount / 1_000_000).toFixed(2)
  const canClaim = (stats?.claimableAmount || 0) >= 5_000_000

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-500">Failed to load</p>
  }

  // Compact embedded view
  if (embedded) {
    return (
      <div className="space-y-3">
        {/* Referral Link - Compact */}
        {stats?.code ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded px-3 py-1.5 font-mono text-xs truncate border border-zinc-200 dark:border-zinc-700">
              {stats.referralLink}
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-8 px-2">
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-8 text-xs border-dashed"
          >
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Coins className="h-3 w-3 mr-2" />}
            Generate Referral Link
          </Button>
        )}

        {/* Stats Row - Compact */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-4">
            <span>
              <span className="font-semibold text-blue-500">{stats?.referralCount || 0}</span> referrals
            </span>
            <span>
              <span className="font-semibold text-green-500">${formatUSDC(stats?.lifetimeEarnings || 0)}</span> earned
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleClaim}
              disabled={isClaiming || !canClaim}
              className="h-7 text-xs"
            >
              {isClaiming ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Coins className="h-3 w-3 mr-1" />
                  {canClaim ? `Claim $${formatUSDC(stats?.claimableAmount || 0)}` : 'Claim Rewards'}
                </>
              )}
            </Button>
            {!canClaim && <span className="text-[10px] text-muted-foreground">Min. $5.00</span>}
          </div>
        </div>

        {claimMessage && (
          <p className={`text-xs ${claimMessage.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
            {claimMessage}
          </p>
        )}
      </div>
    )
  }

  // Standalone view (full card - not used in new design but kept for backwards compat)
  return (
    <div className="space-y-4">
      {stats?.code ? (
        <div className="flex gap-2">
          <div className="flex-1 bg-muted rounded-md px-3 py-2 font-mono text-sm truncate">{stats.referralLink}</div>
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full text-xs"
        >
          {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : 'Generate Referral Link'}
        </Button>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-xl font-bold text-blue-500">{stats?.referralCount || 0}</p>
          <p className="text-xs text-muted-foreground">Referrals</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-xl font-bold text-green-500">${formatUSDC(stats?.lifetimeEarnings || 0)}</p>
          <p className="text-xs text-muted-foreground">Lifetime</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-xl font-bold text-orange-500">${formatUSDC(stats?.claimableAmount || 0)}</p>
          <p className="text-xs text-muted-foreground">Claimable</p>
        </div>
      </div>

      {(stats?.claimableAmount || 0) > 0 && (
        <Button className="w-full" size="sm" onClick={handleClaim} disabled={isClaiming || !canClaim}>
          {isClaiming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            `Claim $${formatUSDC(stats?.claimableAmount || 0)}`
          )}
        </Button>
      )}
    </div>
  )
}
