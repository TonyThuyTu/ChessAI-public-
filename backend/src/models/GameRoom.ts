import { Chess } from 'chess.js';

export class GameRoom {
    public chess: Chess;
    public logs: string[];

    constructor() {
        this.chess = new Chess();
        this.logs = [];
    }

    public getFen(): string {
        return this.chess.fen();
    }

    public makeMove(from: string, to: string): boolean {
        try {
            const result = this.chess.move({ from, to, promotion: 'q' }); // Tự động phong Hậu nếu tốt tới hàng cuối
            return result !== null;
        } catch {
            return false;
        }
    }

    public isGameOver(): boolean {
        return this.chess.isGameOver();
    }
}