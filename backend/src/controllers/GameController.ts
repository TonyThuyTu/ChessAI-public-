import type { Request, Response } from 'express';
import { GameRoom } from '../models/GameRoom.js';
import { AIService } from '../services/AIService.js';

export class GameController {
    private gameRoom = new GameRoom();
    private aiService = new AIService();

    public resetGame = (_req: Request, res: Response) => {
        try {
            this.gameRoom = new GameRoom();
            console.log('[HỆ THỐNG] Đã reset game.');
            return res.json({
                message: 'Đã làm mới bàn cờ thành công.',
                fen: this.gameRoom.getFen(),
            });
        } catch (error) {
            console.error('Lỗi khi reset game:', error);
            return res.status(500).json({ error: 'Không thể reset trận đấu.' });
        }
    };

    public handleMove = async (req: Request, res: Response): Promise<any> => {
        try {
            const { from, to } = req.body;

            // Log state hiện tại trước khi đi
            console.log('[DEBUG] FEN trước khi player đi:', this.gameRoom.getFen());
            console.log('[DEBUG] Player gửi:', { from, to });

            const isPlayerMoveValid = this.gameRoom.makeMove(from, to);
            if (!isPlayerMoveValid) {
                console.error('[ERROR] Nước đi phạm luật:', { from, to });
                console.error('[ERROR] FEN hiện tại:', this.gameRoom.getFen());
                console.error('[ERROR] Legal moves:', this.gameRoom.chess.moves());
                return res.status(400).json({ error: 'Nước đi phạm luật!' });
            }

            console.log('[DEBUG] FEN sau khi player đi:', this.gameRoom.getFen());
            console.log('[DEBUG] History:', this.gameRoom.getHistory());

            if (this.gameRoom.isGameOver()) {
                return res.json({
                    fen: this.gameRoom.getFen(),
                    gameOver: true,
                    reason: this.gameRoom.getGameOverReason(),
                    winner: 'player',
                    history: this.gameRoom.getHistory(),
                    capturedByWhite: this.gameRoom.capturedByWhite,
                    capturedByBlack: this.gameRoom.capturedByBlack,
                    aiMove: '',
                });
            }

            const legalMoves = this.gameRoom.chess.moves();
            console.log('[DEBUG] Legal moves cho AI:', legalMoves);

            const aiMove = await this.aiService.getBestMove({
                fen: this.gameRoom.getFen(),
                legalMoves,
                moveHistory: this.gameRoom.getHistory(),
                boardHistory: this.gameRoom.getBoardHistory(),
                capturedByWhite: this.gameRoom.capturedByWhite,
                capturedByBlack: this.gameRoom.capturedByBlack,
            });

            console.log('[DEBUG] AI chọn:', aiMove.san);

            const isAIMoveValid = this.gameRoom.makeMoveFromSan(aiMove.san);
            if (!isAIMoveValid) {
                console.warn('[WARN] AI đi sai, fallback:', legalMoves[0]);
                this.gameRoom.makeMoveFromSan(legalMoves[0]);
            }

            console.log('[DEBUG] FEN cuối:', this.gameRoom.getFen());

            return res.json({
                fen: this.gameRoom.getFen(),
                gameOver: this.gameRoom.isGameOver(),
                reason: this.gameRoom.getGameOverReason(),
                history: this.gameRoom.getHistory(),
                capturedByWhite: this.gameRoom.capturedByWhite,
                capturedByBlack: this.gameRoom.capturedByBlack,
                aiMove: aiMove.san,
            });

        } catch (error) {
            console.error('[ERROR] handleMove:', error);
            return res.status(500).json({ error: 'Lỗi máy chủ xử lý trận đấu.' });
        }
    };

    public handleSkip = async (req: Request, res: Response): Promise<any> => {
        try {
            // Chỉ cho skip khi đang là lượt trắng (player)
            if (this.gameRoom.chess.turn() !== 'w') {
                return res.status(400).json({ error: 'Không phải lượt của bạn.' });
            }

            if (this.gameRoom.isGameOver()) {
                return res.status(400).json({ error: 'Trận đấu đã kết thúc.' });
            }

            console.log('[DEBUG] Player bỏ qua lượt, AI đi luôn.');
            console.log('[DEBUG] FEN khi skip:', this.gameRoom.getFen());

            // chess.js không hỗ trợ null move nên ta tạm thời
            // đổi lượt bằng cách load lại FEN với lượt đen
            const currentFen = this.gameRoom.getFen();
            const fenParts = currentFen.split(' ');
            fenParts[1] = 'b'; // đổi sang lượt đen
            // Reset halfmove clock và fullmove number cho hợp lý
            const skippedFen = fenParts.join(' ');

            // Load FEN đã đổi lượt vào chess instance
            this.gameRoom.chess.load(skippedFen);

            const legalMoves = this.gameRoom.chess.moves();

            if (legalMoves.length === 0) {
                return res.status(400).json({ error: 'AI không có nước đi hợp lệ.' });
            }

            const aiMove = await this.aiService.getBestMove({
                fen: this.gameRoom.getFen(),
                legalMoves,
                moveHistory: this.gameRoom.getHistory(),
                capturedByWhite: this.gameRoom.capturedByWhite,
                capturedByBlack: this.gameRoom.capturedByBlack,
            });

            console.log('[DEBUG] AI chọn (sau skip):', aiMove.san);

            const isAIMoveValid = this.gameRoom.makeMoveFromSan(aiMove.san);
            if (!isAIMoveValid) {
                console.warn('[WARN] AI đi sai, fallback:', legalMoves[0]);
                this.gameRoom.makeMoveFromSan(legalMoves[0]);
            }

            console.log('[DEBUG] FEN sau skip:', this.gameRoom.getFen());

            return res.json({
                fen: this.gameRoom.getFen(),
                gameOver: this.gameRoom.isGameOver(),
                reason: this.gameRoom.getGameOverReason(),
                history: this.gameRoom.getHistory(),
                capturedByWhite: this.gameRoom.capturedByWhite,
                capturedByBlack: this.gameRoom.capturedByBlack,
                aiMove: aiMove.san,
                skipped: true, // frontend biết lượt này bị skip
            });

        } catch (error) {
            console.error('[ERROR] handleSkip:', error);
            return res.status(500).json({ error: 'Lỗi máy chủ khi xử lý skip.' });
        }
    };
}