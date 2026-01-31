interface GameLoadingProps {
  ready: boolean
  message?: string
}

export function GameLoading({ ready, message }: GameLoadingProps) {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <img
          src="/images/lock-in.png"
          alt="Voble"
          className="w-32 h-32 object-contain"
        />

        {/* Loading Text */}
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-white tracking-wide">
            {message || (!ready ? 'Initializing' : 'Ready to Lock In ...')}
          </p>

          {/* Minimal loading indicator */}
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

