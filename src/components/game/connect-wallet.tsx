import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Wallet, WalletIcon } from 'lucide-react'

interface ConnectWalletProps {
  login: () => void
}

export function ConnectWallet({ login }: ConnectWalletProps) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-[#0f0f10]">
        <CardContent className="pt-12 pb-12 px-8 text-center space-y-8">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <WalletIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Connect to Play</h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">Enter the Voble arena.</p>
          </div>

          <Button
            onClick={login}
            size="lg"
            className="w-full h-14 text-base font-bold bg-[#1877F2] hover:bg-[#1877F2]/90 text-white transition-all hover:scale-[1.02]"
          >
            <Wallet className="h-5 w-5 mr-2" />
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
