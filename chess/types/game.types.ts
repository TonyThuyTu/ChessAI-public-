export interface MoveRequest {
  from: string;
  to: string;
}

export interface GameResponse {
  fen: string;
  gameOver: boolean;
  reason: string | null;        // 'checkmate' | 'draw' | 'stalemate' | ...
  winner?: 'player' | 'ai' | null;
  history: string[];            // ['e4', 'e5', 'Nf3', ...]
  capturedByWhite: string[];    // quân đen bị trắng ăn
  capturedByBlack: string[];    // quân trắng bị đen ăn
  aiMove: string;               // nước AI vừa đi dạng SAN
}