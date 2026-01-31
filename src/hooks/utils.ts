import { createSolanaRpc, type Rpc, type Address, isAddress } from '@solana/kit'

/**
 * Constants
 */
export const LAMPORTS_PER_SOL = 1_000_000_000

/**
 * Get RPC endpoint from environment
 */
export function getRpcEndpoint(): string {
  return '/api/rpc'
}

/**
 * Create a Solana RPC instance
 */
export function createRpc(): ReturnType<typeof createSolanaRpc> {
  return createSolanaRpc(getRpcEndpoint())
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL)
}

/**
 * Common error messages
 */
export const ERRORS = {
  WALLET_NOT_CONNECTED: 'Wallet not connected',
  PROFILE_NOT_FOUND: 'User profile not found',
  GAME_SESSION_NOT_ACTIVE: 'Game session not active',
  TRANSACTION_FAILED: 'Transaction failed',
  INSUFFICIENT_FUNDS: 'Insufficient SOL balance for transaction',
  TRANSACTION_EXPIRED: 'Transaction expired, please try again',
  ACCOUNT_IN_USE: 'Account already exists or is in use',
  SIMULATION_FAILED: 'Transaction simulation failed',
} as const

/**
 * Handle common transaction errors
 */
export function handleTransactionError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Check for common Solana errors
    if (message.includes('insufficient funds') || message.includes('insufficient lamports')) {
      return ERRORS.INSUFFICIENT_FUNDS
    }
    if (message.includes('blockhash not found') || message.includes('blockhash expired')) {
      return ERRORS.TRANSACTION_EXPIRED
    }
    if (message.includes('already in use') || message.includes('already exists')) {
      return ERRORS.ACCOUNT_IN_USE
    }
    if (message.includes('simulation failed')) {
      return ERRORS.SIMULATION_FAILED
    }
    if (message.includes('user rejected')) {
      return 'Transaction was rejected'
    }

    return error.message
  }

  return 'Unknown error occurred'
}

/**
 * Check if an address is valid
 */
export function isValidAddress(addr: string): boolean {
  return isAddress(addr)
}

/**
 * Shorten an address for display
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error | unknown

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  throw lastError
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp: number | bigint): string {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString()
}

/**
 * Get current Unix timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000)
}
