import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Loader2, KeyRound, CheckCircle } from 'lucide-react'
import { usePrivateRollupAuth } from '@/hooks/use-private-rollup-auth'

interface InitializeSessionDialogProps {
  open: boolean
  isInitializing: boolean
  isSessionCreated?: boolean
  onInitialize: () => void
}

export function InitializeSessionDialog({ open, isInitializing, isSessionCreated, onInitialize }: InitializeSessionDialogProps) {
  const { authToken, isAuthenticating } = usePrivateRollupAuth()

  const isAuthenticated = !!authToken

  return (
    <Dialog open={open} onOpenChange={() => { }}>
      <DialogContent className="sm:max-w-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f10] shadow-xl">
        <div className="pt-6 pb-2 text-center space-y-6">
          {/* Logo */}
          <div className="mx-auto w-20 h-20">
            <Image
              src="/images/logo.png"
              alt="Voble"
              width={80}
              height={80}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {isAuthenticated ? 'One More Step' : 'Setting Up...'}
            </DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
              {isAuthenticated
                ? 'Create a session account to save all your game records onchain.'
                : 'Please sign the message in your wallet to authenticate.'}
            </DialogDescription>
          </div>

          {/* Loading Steps - Similar to game-lobby.tsx */}
          <div className="flex flex-col items-center gap-2 text-sm font-mono">
            <p className="flex items-center gap-2 text-zinc-400">
              {isAuthenticated ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              )}
              <span className={isAuthenticated ? 'text-green-500' : ''}>
                Authenticating with TEE
              </span>
            </p>
            <p className="flex items-center gap-2 text-zinc-500">
              {isSessionCreated ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : isAuthenticated ? (
                isInitializing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-600" />
                )
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-zinc-700" />
              )}
              <span className={isSessionCreated ? 'text-green-500' : isInitializing ? 'text-zinc-400' : ''}>
                Creating Session Account
              </span>
            </p>
          </div>

          {/* Cost info - only show when authenticated */}
          {isAuthenticated && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">One-time deposit:</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">~0.028 SOL</span>
              <span className="text-zinc-400 dark:text-zinc-500">(refundable)</span>
            </div>
          )}

          {/* Button - Only show when authenticated, with primary blue background */}
          {isAuthenticated && (
            <Button
              onClick={onInitialize}
              disabled={isInitializing}
              size="lg"
              className="w-full h-14 text-base font-bold bg-[#1877F2] text-white hover:bg-[#1877F2]/90 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-5 w-5" />
                  Create Session
                </>
              )}
            </Button>
          )}

          {/* Helper text - show when authenticating */}
          {!isAuthenticated && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Waiting for wallet signature... No gas fees required.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
