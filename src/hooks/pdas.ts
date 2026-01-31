/**
 * PDA derivation utilities using @solana/kit
 */
import {
  getProgramDerivedAddress,
  getAddressEncoder,
  getUtf8Encoder,
  type Address,
  type ProgramDerivedAddressBump,
} from '@solana/kit'
import { VOBLE_PROGRAM_ADDRESS } from '@clients/js/src/generated'
import {
  delegationRecordPdaFromDelegatedAccount,
  delegationMetadataPdaFromDelegatedAccount,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  PERMISSION_PROGRAM_ID,
} from '@magicblock-labs/ephemeral-rollups-kit'

/**
 * Delegation Program ID (MagicBlock ER)
 */
export const DELEGATION_PROGRAM_ADDRESS = 'DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh' as Address

// Re-export VOBLE_PROGRAM_ADDRESS for external use
export { VOBLE_PROGRAM_ADDRESS }

/**
 * Permission Program ID (MagicBlock Private ER - SDK 0.8.0)
 * Updated from BTWAqWNBmF2TboMh3fxMJfgR16xGHYD7Kgr2dPwbRPBi (old)
 */
export const PERMISSION_PROGRAM_ADDRESS = 'ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1' as Address

/**
 * PDA seed constants (matching the smart contract)
 */
export const PDA_SEEDS = {
  USER_PROFILE: 'user_profile',
  SESSION: 'session',
  GLOBAL_CONFIG: 'global_config',
  DAILY_PRIZE_VAULT: 'daily_prize_vault',
  WEEKLY_PRIZE_VAULT: 'weekly_prize_vault',
  MONTHLY_PRIZE_VAULT: 'monthly_prize_vault',
  PLATFORM_VAULT: 'platform_vault',
  PAYOUT_VAULT: 'payout_vault',
  LUCKY_DRAW_VAULT: 'lucky_draw_vault',
  VOBLE_VAULT: 'voble_vault',
  LEADERBOARD: 'leaderboard',
  DAILY_PERIOD: 'daily_period',
  WEEKLY_PERIOD: 'weekly_period',
  MONTHLY_PERIOD: 'monthly_period',
  WINNER_ENTITLEMENT: 'winner_entitlement',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  TARGET_WORD: 'target_word',
} as const

// Helper encoders
const addressEncoder = getAddressEncoder()
const utf8Encoder = getUtf8Encoder()

// Type alias for PDA result (matches what getProgramDerivedAddress returns)
export type ProgramDerivedAddressResult = readonly [Address, ProgramDerivedAddressBump]

/**
 * Derive user profile PDA
 */
export async function getUserProfilePDA(playerAddress: Address): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.USER_PROFILE, addressEncoder.encode(playerAddress)],
  })
}

/**
 * Derive session PDA
 */
export async function getSessionPDA(playerAddress: Address): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.SESSION, addressEncoder.encode(playerAddress)],
  })
}

/**
 * Derive global config PDA
 */
export async function getGlobalConfigPDA(): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.GLOBAL_CONFIG],
  })
}

/**
 * Derive daily prize vault PDA
 */
export async function getDailyPrizeVaultPDA(): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.DAILY_PRIZE_VAULT],
  })
}

/**
 * Derive weekly prize vault PDA
 */
export async function getWeeklyPrizeVaultPDA(): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.WEEKLY_PRIZE_VAULT],
  })
}

/**
 * Derive monthly prize vault PDA
 */
export async function getMonthlyPrizeVaultPDA(): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.MONTHLY_PRIZE_VAULT],
  })
}

/**
 * Derive platform vault PDA
 */
export async function getPlatformVaultPDA(): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.PLATFORM_VAULT],
  })
}

/**
 * Derive payout vault PDA
 */
export async function getPayoutVaultPDA(): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.PAYOUT_VAULT],
  })
}

/**
 * Derive lucky draw vault PDA
 */
export async function getLuckyDrawVaultPDA(): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.LUCKY_DRAW_VAULT],
  })
}

/**
 * Derive voble vault PDA
 */
export async function getVobleVaultPDA(): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.VOBLE_VAULT],
  })
}

/**
 * Derive leaderboard PDA
 */
export async function getLeaderboardPDA(
  periodId: string,
  leaderboardType: 'daily' | 'weekly' | 'monthly',
): Promise<ProgramDerivedAddressResult> {
  const periodTypeByte = leaderboardType === 'daily' ? 0 : leaderboardType === 'weekly' ? 1 : 2

  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.LEADERBOARD, utf8Encoder.encode(periodId), new Uint8Array([periodTypeByte])],
  })
}

/**
 * Derive daily period state PDA
 */
export async function getDailyPeriodPDA(periodId: string): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.DAILY_PERIOD, utf8Encoder.encode(periodId)],
  })
}

export async function getEventAuthorityPDA(): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: ["__event_authority"],
  })
}

/**
 * Derive weekly period state PDA
 */
export async function getWeeklyPeriodPDA(periodId: string): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.WEEKLY_PERIOD, utf8Encoder.encode(periodId)],
  })
}

/**
 * Derive monthly period state PDA
 */
export async function getMonthlyPeriodPDA(periodId: string): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [PDA_SEEDS.MONTHLY_PERIOD, utf8Encoder.encode(periodId)],
  })
}

/**
 * Derive winner entitlement PDA
 */
export async function getWinnerEntitlementPDA(
  winnerAddress: Address,
  entitlementType: 'daily' | 'weekly' | 'monthly',
  periodId: string,
): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [
      PDA_SEEDS.WINNER_ENTITLEMENT,
      addressEncoder.encode(winnerAddress),
      utf8Encoder.encode(entitlementType),
      utf8Encoder.encode(periodId),
    ],
  })
}

/**
 * Derive lucky draw state PDA
 */
export async function getLuckyDrawStatePDA(periodId: string): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: ['lucky_draw', utf8Encoder.encode(periodId)],
  })
}

/**
 * Derive delegation buffer PDA (for MagicBlock ER)
 * Uses VOBLE_PROGRAM_ADDRESS as owner since our program owns the permissioned accounts
 */
export async function getDelegationBufferPDA(pda: Address): Promise<readonly [Address, never]> {
  const result = await delegateBufferPdaFromDelegatedAccountAndOwnerProgram(pda, VOBLE_PROGRAM_ADDRESS)
  return [result, 0 as never] as const
}

/**
 * Derive delegation record PDA (for MagicBlock ER)
 * Uses SDK function to ensure correct derivation
 */
export async function getDelegationRecordPDA(pda: Address): Promise<readonly [Address, never]> {
  const result = await delegationRecordPdaFromDelegatedAccount(pda)
  return [result, 0 as never] as const
}

/**
 * Derive delegation metadata PDA (for MagicBlock ER)
 * Uses SDK function to ensure correct derivation
 */
export async function getDelegationMetadataPDA(pda: Address): Promise<readonly [Address, never]> {
  const result = await delegationMetadataPdaFromDelegatedAccount(pda)
  return [result, 0 as never] as const
}

/**
 * Derive delegation buffer PDA for permission accounts (for MagicBlock Private ER)
 * Uses PERMISSION_PROGRAM_ID as owner since Permission Program owns the permission accounts
 * This is different from getDelegationBufferPDA which uses VOBLE_PROGRAM_ADDRESS
 */
export async function getPermissionDelegationBufferPDA(permissionPda: Address): Promise<readonly [Address, never]> {
  const result = await delegateBufferPdaFromDelegatedAccountAndOwnerProgram(permissionPda, PERMISSION_PROGRAM_ID as Address)
  return [result, 0 as never] as const
}

/**
 * Derive permission PDA for an account (MagicBlock Private ER)
 * Uses seed: 'permission:' + account address (note the colon!)
 */
export async function getPermissionPDA(accountAddress: Address): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: PERMISSION_PROGRAM_ADDRESS,
    seeds: ['permission:', addressEncoder.encode(accountAddress)],
  })
}

/**
 * Derive group PDA from group ID (MagicBlock Private ER)
 * Uses seed: 'group:' + group ID (note the colon!)
 */
export async function getGroupPDA(groupId: Address): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: PERMISSION_PROGRAM_ADDRESS,
    seeds: ['group:', addressEncoder.encode(groupId)],
  })
}

// Re-export period utilities from the new location for backwards compatibility
export {
  getCurrentDayPeriodId,
  getCurrentWeekPeriodId,
  getCurrentMonthPeriodId,
  getCurrentPeriodIds,
} from '@/lib/periods'

/**
 * Derive target word PDA for a player
 */
export async function getTargetWordPDA(playerAddress: Address): Promise<ProgramDerivedAddressResult> {
  return getProgramDerivedAddress({
    programAddress: VOBLE_PROGRAM_ADDRESS,
    seeds: [utf8Encoder.encode(PDA_SEEDS.TARGET_WORD), addressEncoder.encode(playerAddress)],
  })
}
