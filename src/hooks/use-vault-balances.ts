import { useQuery } from '@tanstack/react-query'
import { createSolanaRpc, type Address } from '@solana/kit'

import {
  getDailyPrizeVaultPDA,
  getWeeklyPrizeVaultPDA,
  getMonthlyPrizeVaultPDA,
  getPlatformVaultPDA,
  getLuckyDrawVaultPDA,
} from './pdas'

export interface VaultBalance {
  address: string
  balance: number // in USDC
  balanceLamports: number // in atomic units
}

export interface VaultBalances {
  daily: VaultBalance
  weekly: VaultBalance
  monthly: VaultBalance
  luckyDraw: VaultBalance
  platform: VaultBalance
  totalPrizePool: number
}

export interface VaultBalancesResult {
  balances: VaultBalances | null
  isLoading: boolean
  isFetching: boolean
  error: string | null
  refetch: () => void
}

/**
 * Helper to fetch token account balance using RPC
 */
async function getTokenAccountBalance(
  rpc: ReturnType<typeof createSolanaRpc>,
  address: Address,
): Promise<{ uiAmount: number | null; amount: string }> {
  try {
    const result = await rpc.getTokenAccountBalance(address).send()
    return {
      uiAmount: result.value.uiAmount,
      amount: result.value.amount,
    }
  } catch {
    return { uiAmount: 0, amount: '0' }
  }
}

export function useVaultBalances(): VaultBalancesResult {
  const queryResult = useQuery({
    queryKey: ['vaultBalances'],
    queryFn: async (): Promise<VaultBalances> => {
      // Get RPC connection
      const rpc = createSolanaRpc('/api/rpc')

      // Get all vault PDAs (now async)
      const [[dailyVaultPda], [weeklyVaultPda], [monthlyVaultPda], [luckyDrawVaultPda], [platformVaultPda]] =
        await Promise.all([
          getDailyPrizeVaultPDA(),
          getWeeklyPrizeVaultPDA(),
          getMonthlyPrizeVaultPDA(),
          getLuckyDrawVaultPDA(),
          getPlatformVaultPDA(),
        ])

      try {
        // Fetch all vault balances in parallel
        const [dailyBalance, weeklyBalance, monthlyBalance, luckyDrawBalance, platformBalance] = await Promise.all([
          getTokenAccountBalance(rpc, dailyVaultPda),
          getTokenAccountBalance(rpc, weeklyVaultPda),
          getTokenAccountBalance(rpc, monthlyVaultPda),
          getTokenAccountBalance(rpc, luckyDrawVaultPda),
          getTokenAccountBalance(rpc, platformVaultPda),
        ])

        // Transform to our interface
        const balances: VaultBalances = {
          daily: {
            address: dailyVaultPda,
            balance: dailyBalance.uiAmount || 0,
            balanceLamports: Number(dailyBalance.amount),
          },
          weekly: {
            address: weeklyVaultPda,
            balance: weeklyBalance.uiAmount || 0,
            balanceLamports: Number(weeklyBalance.amount),
          },
          monthly: {
            address: monthlyVaultPda,
            balance: monthlyBalance.uiAmount || 0,
            balanceLamports: Number(monthlyBalance.amount),
          },
          luckyDraw: {
            address: luckyDrawVaultPda,
            balance: luckyDrawBalance.uiAmount || 0,
            balanceLamports: Number(luckyDrawBalance.amount),
          },
          platform: {
            address: platformVaultPda,
            balance: platformBalance.uiAmount || 0,
            balanceLamports: Number(platformBalance.amount),
          },
          totalPrizePool: (dailyBalance.uiAmount || 0) + (weeklyBalance.uiAmount || 0) + (monthlyBalance.uiAmount || 0),
        }

        return balances
      } catch (err: unknown) {
        const error = err as Error & { message?: string }
        console.error('❌ [useVaultBalances] Error fetching balances:', err)
        throw new Error(`Failed to fetch vault balances: ${error.message}`)
      }
    },
    staleTime: 0,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 3,
  })

  return {
    balances: queryResult.data || null,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch,
  }
}

/**
 * Hook to get individual vault balance
 */
export function useVaultBalance(vaultType: 'daily' | 'weekly' | 'monthly' | 'luckyDraw' | 'platform'): {
  balance: VaultBalance | null
  isLoading: boolean
  error: string | null
  refetch: () => void
} {
  const queryResult = useQuery({
    queryKey: ['vaultBalance', vaultType],
    queryFn: async (): Promise<VaultBalance> => {
      // Get RPC connection
      const rpc = createSolanaRpc('/api/rpc')

      // Get the specific vault PDA
      let vaultPda: Address
      switch (vaultType) {
        case 'daily':
          ;[vaultPda] = await getDailyPrizeVaultPDA()
          break
        case 'weekly':
          ;[vaultPda] = await getWeeklyPrizeVaultPDA()
          break
        case 'monthly':
          ;[vaultPda] = await getMonthlyPrizeVaultPDA()
          break
        case 'luckyDraw':
          ;[vaultPda] = await getLuckyDrawVaultPDA()
          break
        case 'platform':
          ;[vaultPda] = await getPlatformVaultPDA()
          break
        default:
          throw new Error(`Invalid vault type: ${vaultType}`)
      }

      try {
        const tokenBalance = await getTokenAccountBalance(rpc, vaultPda)

        return {
          address: vaultPda,
          balance: tokenBalance.uiAmount || 0,
          balanceLamports: Number(tokenBalance.amount),
        }
      } catch (err: unknown) {
        const error = err as Error & { message?: string }
        console.error(`❌ [useVaultBalance] Error fetching ${vaultType} balance:`, err)
        throw new Error(`Failed to fetch ${vaultType} vault balance: ${error.message}`)
      }
    },
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 3,
  })

  return {
    balance: queryResult.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch,
  }
}

/**
 * Hook to get total prize pool (daily + weekly + monthly)
 */
export function useTotalPrizePool(): {
  totalSOL: number
  totalLamports: number
  isLoading: boolean
  error: string | null
} {
  const { balances, isLoading, error } = useVaultBalances()

  return {
    totalSOL: balances?.totalPrizePool || 0,
    totalLamports: balances
      ? balances.daily.balanceLamports +
        balances.weekly.balanceLamports +
        balances.monthly.balanceLamports +
        balances.luckyDraw.balanceLamports
      : 0,
    isLoading,
    error,
  }
}
