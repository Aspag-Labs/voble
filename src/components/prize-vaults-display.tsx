'use client'

import { RefreshCw } from 'lucide-react'
import { useVaultBalances } from '@/hooks'

// =====================================================
// DEMO MODE START
// =====================================================
const DEMO_MODE = false

const DEMO_BALANCES = {
  daily: 54.0,
  weekly: 84.0,
  monthly: 180.0,
}
// =====================================================
// DEMO MODE END
// =====================================================

const prizeConfig = [
  { key: 'daily', label: 'Daily', gradient: 'from-blue-500/20 to-blue-600/5' },
  { key: 'weekly', label: 'Weekly', gradient: 'from-orange-500/20 to-orange-600/5' },
  { key: 'monthly', label: 'Monthly', gradient: 'from-emerald-500/20 to-emerald-600/5' },
] as const

export function PrizeVaultsDisplay() {
  const { balances, isLoading, error, refetch, isFetching } = useVaultBalances()

  const displayBalances = DEMO_MODE
    ? {
      daily: { balance: DEMO_BALANCES.daily + (balances?.daily.balance || 0) },
      weekly: { balance: DEMO_BALANCES.weekly + (balances?.weekly.balance || 0) },
      monthly: { balance: DEMO_BALANCES.monthly + (balances?.monthly.balance || 0) },
    }
    : balances

  if (error) {
    return (
      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
        <p className="text-center text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Prize Pools</p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Prize Cards */}
      <div className="flex gap-2">
        {prizeConfig.map(({ key, label }) => {
          const balance = displayBalances?.[key]?.balance || 0

          return (
            <div
              key={key}
              className="flex-1 relative p-3 sm:p-4 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20"
            >
              {/* Label */}
              <p className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                {label}
              </p>

              {/* Amount */}
              {isLoading && !DEMO_MODE ? (
                <div className="h-8 w-16 bg-zinc-800 animate-pulse rounded" />
              ) : (
                <p className="text-2xl sm:text-3xl font-black text-[#22c55e] tracking-tight">
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
