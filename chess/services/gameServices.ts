import axios from "axios";

export interface MoveRequest {
  from: string;
  to: string;
}

export interface GameResponse {
  fen: string;
  gameOver: boolean;
  reason: string | null;           // 'checkmate' | 'draw' | 'stalemate' | ...
  winner?: 'player' | 'ai' | null;
  history: string[];               // Lịch sử SAN: ['e4', 'e5', 'Nf3', ...]
  capturedByWhite: string[];       // Quân đen bị trắng ăn: ['p', 'n', ...]
  capturedByBlack: string[];       // Quân trắng bị đen ăn
  aiMove: string;                  // Nước AI vừa đi dạng SAN
  skipped?: boolean;
}

export interface ResetResponse {
  message: string;
  fen: string;
}

const gameApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  timeout: 60000, // AI proxy có thể chậm, để 60s
  headers: { "Content-Type": "application/json" },
});

export const gameService = {
  sendMove: async (move: MoveRequest): Promise<GameResponse> => {
    const response = await gameApiClient.post<GameResponse>("/game/move", move);
    return response.data;
  },

  skipTurn: async (): Promise<GameResponse> => {
    const response = await gameApiClient.post<GameResponse>("/game/skip");
    return response.data;
  },

  resetServerGame: async (): Promise<ResetResponse> => {
    const response = await gameApiClient.post<ResetResponse>("/game/reset");
    return response.data;
  },
};