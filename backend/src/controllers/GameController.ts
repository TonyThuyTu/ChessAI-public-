// src/controllers/GameController.ts
import type { Request, Response } from 'express';
import { GameRoom } from '../models/GameRoom.js';
import { AIService } from '../services/AIService.js';

export class GameController {
    // Khởi tạo các thực thể
    private gameRoom = new GameRoom();
    private aiService = new AIService();

    // 🌟 SỬA LẠI HÀM RESET NÀY
    public resetGame = (req: Request, res: Response) => {
        try {
            // Khởi tạo lại một GameRoom mới hoàn toàn để xóa sạch bộ nhớ đệm (Cache Memory)
            this.gameRoom = new GameRoom(); 
            
            console.log("[HỆ THỐNG] Đã hủy trận cũ, khởi tạo GameRoom mới tinh.");
            return res.json({ 
                message: "Đã làm mới bàn cờ trên server thành công.",
                fen: this.gameRoom.getFen() 
            });
        } catch (error) {
            console.error("Lỗi khi reset game:", error);
            return res.status(500).json({ error: "Không thể reset trận đấu trên server." });
        }
    }

    public handleMove = async (req: Request, res: Response): Promise<any> => {
        try {
            const { from, to } = req.body;

            // 1. Người chơi thực hiện nước đi
            const isPlayerMoveValid = this.gameRoom.makeMove(from, to);
            if (!isPlayerMoveValid) {
                return res.status(400).json({ error: 'Nước đi phạm luật!' });
            }

            const playerLog = `[PLAYER]: ${from} -> ${to}`;
            this.gameRoom.logs.push(playerLog); // Lưu vào logs của bàn cờ hiện tại
            console.log(playerLog);

            if (this.gameRoom.isGameOver()) {
                return res.json({ message: "Kết thúc! Người chơi thắng.", fen: this.gameRoom.getFen(), logs: this.gameRoom.logs });
            }

            // 2. AI lấy danh sách nước đi hợp lệ
            const aiPossibleMoves = this.gameRoom.chess.moves({ verbose: true });
            
            // 🌟 TRUYỀN ĐÚNG LOGS CỦA TRẬN HIỆN TẠI VÀO AI
            // Việc dùng this.gameRoom.logs đảm bảo AI chỉ đọc đúng lịch sử ván này, không bị lẫn ván cũ
            const aiMove = await this.aiService.getBestMove(this.gameRoom.getFen(), aiPossibleMoves);

            // 3. Thực hiện nước đi của AI
            const isAIMoveValid = this.gameRoom.makeMove(aiMove.from, aiMove.to);
            if (!isAIMoveValid && aiPossibleMoves.length > 0) {
                this.gameRoom.makeMove(aiPossibleMoves[0].from, aiPossibleMoves[0].to);
            }

            const aiLog = `[AI]: ${aiMove.from} -> ${aiMove.to}`;
            this.gameRoom.logs.push(aiLog);
            console.log(aiLog);

            // 4. Trả kết quả về Frontend
            return res.json({
                fen: this.gameRoom.getFen(),
                gameOver: this.gameRoom.isGameOver(),
                logs: this.gameRoom.logs // Trả về tập log sạch
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Lỗi máy chủ xử lý trận đấu.' });
        }
    }
}