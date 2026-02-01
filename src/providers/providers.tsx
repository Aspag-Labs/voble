'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import { ReactQueryProvider } from '@/components/react-query-provider'
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_ID!}
      config={{
        solana: {
          rpcs: {
            'solana:devnet': {
              rpc: createSolanaRpc('/api/rpc'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com'),
            },
          },
        },

        appearance: {
          showWalletLoginFirst: true,
          walletChainType: 'solana-only',
          walletList: ['phantom', 'backpack', 'detected_solana_wallets'],
        },

        externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
      }}
    >
      <ReactQueryProvider>{children}</ReactQueryProvider>
    </PrivyProvider>
  )
}
