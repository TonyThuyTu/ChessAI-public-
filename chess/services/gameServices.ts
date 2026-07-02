import axios from "axios";

export interface MoveRequest {
  from: string;
  to: string;
}

export interface GameResponse {
  fen: string;       // Chuỗi FEN mới sau khi cả người chơi và AI đã đi
  gameOver: boolean;
  logs: string[];    // Log hiển thị
  reasoning?: string; // Đoạn tư duy của Gemini (nếu có)
}

const gameApiClient = axios.create({
  baseURL: "http://localhost:5000/api", // Cổng server Node.js MVC của bạn
  timeout: 15000, // Đợi tối đa 15 giây phòng trường hợp AI Proxy phản hồi chậm
  headers: { "Content-Type": "application/json" },
});

export const gameService = {
  // Gửi nước đi lên BE và nhận về kết quả thế trận mới
  sendMove: async (move: MoveRequest): Promise<GameResponse> => {
    const response = await gameApiClient.post<GameResponse>("/game/move", move);
    return response.data;
  },
  
  // Reset trạng thái bàn cờ trên Server
  resetServerGame: async (): Promise<{ message: string; fen: string }> => {
    const response = await gameApiClient.post("/game/reset");
    return response.data;
  }
};