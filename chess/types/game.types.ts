export interface MoveRequest {
  from: string; // Ví dụ: "e2"
  to: string;   // Ví dụ: "e4"
}

export interface GameResponse {
  fen: string;       // Chuỗi trạng thái bàn cờ mới
  gameOver: boolean; // Trận đấu kết thúc chưa
  message?: string;  // Thông báo kết quả (nếu có)
  logs: string[];    // Danh sách log trận đấu từ BE
}