export type GameMode = 'classic' | 'time';

export interface Block {
  id: string;
  value: number;
  row: number;
  col: number;
}

export interface GameState {
  blocks: Block[];
  target: number;
  score: number;
  gameOver: boolean;
  mode: GameMode;
  timeLeft: number;
  selectedIds: string[];
}

export const GRID_ROWS = 10;
export const GRID_COLS = 7;
export const INITIAL_ROWS = 1;
export const TIME_LIMIT = 10; // seconds per round in time mode
