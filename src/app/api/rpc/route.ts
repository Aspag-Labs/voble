import { NextRequest, NextResponse } from 'next/server'

/**
 * RPC Proxy Route
 *
 * Proxies JSON-RPC requests to the Solana RPC endpoint.
 * This keeps the RPC URL (and any API keys) on the server side.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const rpcUrl = process.env.RPC_URL
    if (!rpcUrl) {
      console.error('RPC_URL environment variable is not set')
      return NextResponse.json({ error: 'RPC endpoint not configured' }, { status: 500 })
    }

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('RPC proxy error:', error)
    return NextResponse.json({ error: 'Failed to proxy RPC request' }, { status: 500 })
  }
}
