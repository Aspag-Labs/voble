export type TileState = 'empty' | 'filled' | 'correct' | 'present' | 'absent'
export type GameStatus = 'playing' | 'won' | 'lost' | 'loading'

export interface GameTile {
  letter: string
  state: TileState
}

export interface GameState {
  grid: GameTile[][]
  currentRow: number
  currentCol: number
  gameStatus: GameStatus
  targetWord: string
  guesses: string[]
  score: number
  timeElapsed: number
  showResultModal: boolean
}

export const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
]
