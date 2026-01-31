import { Timer } from 'lucide-react'
import { TileState, GameState, KEYBOARD_ROWS } from '@/types/game'

interface GameBoardProps {
  gameState: GameState
  keyboardState: Record<string, TileState>
  formatTime: (seconds: number) => string
  handleKeyPress: (key: string) => void
  errorMessage?: string | null
}

export function GameBoard({ gameState, keyboardState, formatTime, handleKeyPress, errorMessage }: GameBoardProps) {
  const getTileStyle = (state: TileState) => {
    switch (state) {
      case 'correct':
        return 'bg-[#14F195] border-[#14F195] text-white font-bold shadow-lg'
      case 'present':
        return 'bg-[#9945FF] border-[#9945FF] text-white font-bold shadow-lg'
      case 'absent':
        return 'bg-gray-500 border-gray-500 text-white font-bold'
      case 'filled':
        return 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold border-2 scale-105'
      default:
        return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white border-2'
    }
  }

  const getKeyStyle = (letter: string) => {
    const state = keyboardState[letter] || 'empty'
    const baseStyle =
      'px-2 py-3 sm:px-4 sm:py-6 rounded-lg font-medium text-sm sm:text-base transition-all duration-200 hover:scale-105 min-w-[2rem] sm:min-w-[2.5rem]'

    switch (state) {
      case 'correct':
        return `${baseStyle} bg-[#14F195] text-white shadow-lg`
      case 'present':
        return `${baseStyle} bg-[#9945FF] text-white shadow-lg`
      case 'absent':
        return `${baseStyle} bg-gray-500 text-white`
      default:
        return `${baseStyle} bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600`
    }
  }

  return (
    <div className="fade-in-up mt-8">
      {/* HEADER with Timer */}
      <div className="flex justify-center items-center mb-6 sm:mb-8 px-4">
        {/* Timer Centered */}
        <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-zinc-800/80 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:scale-105">
          <Timer className={`w-5 h-5 text-indigo-500 ${gameState.gameStatus === 'playing' ? 'animate-pulse' : ''}`} />
          <span className="font-mono text-2xl font-bold tracking-wider text-zinc-700 dark:text-zinc-200">
            {gameState.gameStatus === 'playing' ? formatTime(gameState.timeElapsed) : '0:00'}
          </span>
        </div>
      </div>

      {/* GRID */}
      <div className="flex justify-center mb-8 pb-4">
        <div className="grid grid-rows-6 gap-2 p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          {gameState.grid.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-6 gap-2">
              {row.map((tile, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-bold rounded-lg transition-all duration-300 transform ${getTileStyle(
                    tile.state,
                  )} ${tile.letter && tile.state === 'empty' ? 'scale-105 border-zinc-400 dark:border-zinc-500' : ''}`}
                >
                  {tile.letter}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {errorMessage && (
        <div className="text-center mb-4">
          <span className="inline-block px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium animate-pulse">
            {errorMessage}
          </span>
        </div>
      )}

      {/* KEYBOARD */}
      <div className="w-full max-w-3xl mx-auto px-1 sm:px-4">
        <div className="grid gap-2">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1 sm:gap-2">
              {row.map((key) => (
                <button key={key} onClick={() => handleKeyPress(key)} className={getKeyStyle(key)}>
                  {key === 'BACKSPACE' ? (
                    <span className="text-xs sm:text-sm">⌫</span>
                  ) : key === 'ENTER' ? (
                    <span className="text-xs sm:text-sm">ENTER</span>
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
