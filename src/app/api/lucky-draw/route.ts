import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { keccak256 } from 'js-sha3'
import { createSolanaRpc, address, type Address } from '@solana/kit'
import { fetchMaybeLuckyDrawState } from '@clients/js/src/generated'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// ===== MERKLE TREE LOGIC (matching smart contract's keccak) =====

function hashLeaf(addr: Address | string): Buffer {
  const addrStr = typeof addr === 'string' ? addr : String(addr)
  // Use keccak256 to match solana_program::keccak in the smart contract
  return Buffer.from(keccak256.arrayBuffer(Buffer.from(addrStr)))
}

function hashPair(left: Buffer, right: Buffer): Buffer {
  // Sort to ensure consistent ordering (matching smart contract)
  if (left.compare(right) <= 0) {
    return Buffer.from(keccak256.arrayBuffer(Buffer.concat([left, right])))
  } else {
    return Buffer.from(keccak256.arrayBuffer(Buffer.concat([right, left])))
  }
}

interface MerkleTree {
  root: Buffer
  leaves: Buffer[]
  layers: Buffer[][]
}

function buildMerkleTree(addresses: (Address | string)[]): MerkleTree {
  if (addresses.length === 0) {
    return { root: Buffer.alloc(32), leaves: [], layers: [] }
  }

  const leaves = addresses.map((addr) => hashLeaf(addr))
  const layers: Buffer[][] = [leaves]

  let currentLayer = leaves
  while (currentLayer.length > 1) {
    const nextLayer: Buffer[] = []
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        nextLayer.push(hashPair(currentLayer[i], currentLayer[i + 1]))
      } else {
        nextLayer.push(currentLayer[i])
      }
    }
    layers.push(nextLayer)
    currentLayer = nextLayer
  }

  return { root: currentLayer[0], leaves, layers }
}

function getMerkleProof(tree: MerkleTree, index: number): Buffer[] {
  const proof: Buffer[] = []
  let currentIndex = index

  for (let i = 0; i < tree.layers.length - 1; i++) {
    const layer = tree.layers[i]
    const isLeft = currentIndex % 2 === 0
    const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1

    if (siblingIndex < layer.length) {
      proof.push(layer[siblingIndex])
    }

    currentIndex = Math.floor(currentIndex / 2)
  }

  return proof
}

// ===== DATE HELPERS =====

function getWeekDates(periodId: string): { start: string; end: string } {
  const match = periodId.match(/^(\d{4})-W(\d{1,2})$/)
  if (!match) {
    throw new Error(`Invalid period ID format: ${periodId}`)
  }

  const year = parseInt(match[1], 10)
  const weekNum = parseInt(match[2], 10)

  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7

  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - dayOfWeek + 1)

  const startDate = new Date(week1Monday)
  startDate.setDate(week1Monday.getDate() + (weekNum - 1) * 7)

  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)

  const format = (d: Date) => d.toISOString().split('T')[0]
  return { start: format(startDate), end: format(endDate) }
}

// ===== FETCH CANDIDATES =====

async function fetchEligibleCandidates(periodId: string): Promise<string[]> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { start, end } = getWeekDates(periodId)

  const { data, error } = await supabase
    .from('game_history')
    .select('player')
    .gte('period_id', start)
    .lte('period_id', end)
    .order('player', { ascending: true }) // Deterministic order for Merkle tree consistency

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  const uniquePlayers = Array.from(new Set(data?.map((d) => d.player) || []))
  return uniquePlayers
}

// ===== API HANDLER =====

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('periodId')
    const walletAddress = searchParams.get('wallet')

    if (!periodId) {
      return NextResponse.json({ error: 'periodId is required' }, { status: 400 })
    }
    if (!walletAddress) {
      return NextResponse.json({ error: 'wallet is required' }, { status: 400 })
    }

    // 1. Fetch on-chain lucky draw state to get winning index
    const rpc = createSolanaRpc(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com')

    // Get lucky draw state PDA
    const [luckyDrawStatePda] = await import('@/hooks/pdas').then((m) => m.getLuckyDrawStatePDA(periodId))
    const maybeState = await fetchMaybeLuckyDrawState(rpc, luckyDrawStatePda)

    if (!maybeState.exists) {
      return NextResponse.json({ error: 'Lucky draw not found for this period' }, { status: 404 })
    }

    if (maybeState.data.isPending) {
      return NextResponse.json({ error: 'Lucky draw VRF still pending' }, { status: 400 })
    }

    const winningIndex = maybeState.data.winningIndex

    // 2. Fetch candidates (same order as finalize script)
    const candidates = await fetchEligibleCandidates(periodId)

    if (winningIndex >= candidates.length) {
      return NextResponse.json({ error: 'Winning index out of bounds' }, { status: 500 })
    }

    // 3. Check if requester is the winner
    const winner = candidates[winningIndex]
    if (winner !== walletAddress) {
      return NextResponse.json(
        {
          error: 'You are not the winner',
          winner,
          yourAddress: walletAddress,
        },
        { status: 403 },
      )
    }

    // 4. Build Merkle tree and get proof
    const tree = buildMerkleTree(candidates)
    const proof = getMerkleProof(tree, winningIndex)

    // 5. Return proof as hex strings for easy transport
    return NextResponse.json({
      success: true,
      periodId,
      winner,
      winningIndex,
      candidatesCount: candidates.length,
      merkleProof: proof.map((p) => p.toString('hex')),
      merkleRoot: tree.root.toString('hex'),
    })
  } catch (error: any) {
    console.error('[lucky-draw/proof] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
