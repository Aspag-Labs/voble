/**
 * Period ID utilities for Voble game periods
 * All period IDs are generated in UTC+8 (Asia/Singapore timezone)
 */

/**
 * Get period ID for current day (YYYY-MM-DD format) in UTC+8
 */
export function getCurrentDayPeriodId(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date()) // Returns YYYY-MM-DD
}

/**
 * Epoch-based period constants (matching smart contract)
 * From smart contract constants.rs:
 * pub const PERIOD_EPOCH_START: i64 = 1704038400; // January 1, 2024 00:00:00 UTC+8
 * January 1, 2024 was a Monday, so weeks naturally align Mon-Sun
 */
const PERIOD_EPOCH_START = 1704038400 // January 1, 2024 00:00:00 UTC+8 (seconds)
const PERIOD_WEEKLY_DURATION = 7 * 24 * 60 * 60 // 604800 seconds

/**
 * Get period ID for current week using epoch-based calculation (matching smart contract)
 * Returns format like "W108" (week number from epoch)
 */
export function getCurrentWeekPeriodId(): string {
  // Get current time in UTC+8
  const now = new Date()
  const utc8TimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' })
  const nowUtc8 = new Date(utc8TimeStr)

  // Epoch-based calculation matching smart contract
  const nowUnixSeconds = Math.floor(nowUtc8.getTime() / 1000)
  const elapsedSeconds = nowUnixSeconds - PERIOD_EPOCH_START
  const weekNumber = Math.floor(elapsedSeconds / PERIOD_WEEKLY_DURATION)
  return `W${weekNumber}`
}

/**
 * Get period ID for current month (YYYY-MM format) in UTC+8
 */
export function getCurrentMonthPeriodId(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
  })
  // en-CA returns YYYY-MM-DD, we just need YYYY-MM
  return formatter.format(new Date()).slice(0, 7)
}

/**
 * Get all current period IDs
 */
export function getCurrentPeriodIds(): {
  daily: string
  weekly: string
  monthly: string
} {
  return {
    daily: getCurrentDayPeriodId(),
    weekly: getCurrentWeekPeriodId(),
    monthly: getCurrentMonthPeriodId(),
  }
}
