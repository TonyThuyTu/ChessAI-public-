import { Chess } from 'chess.js';

export class GameRoom {
    public chess: Chess;
    public capturedByWhite: string[]; // Quân đen bị trắng ăn
    public capturedByBlack: string[]; // Quân trắng bị đen ăn

    constructor() {
        this.chess = new Chess();
        this.capturedByWhite = [];
        this.capturedByBlack = [];
    }

    public getFen(): string {
        return this.chess.fen();
    }

    public getHistory(): string[] {
        return this.chess.history(); // SAN notation, chess.js tự track
    }

    public makeMove(from: string, to: string, promotion = 'q'): boolean {
        try {
            const result = this.chess.move({ from, to, promotion });
            if (!result) return false;

            // Track quân bị ăn
            if (result.captured) {
                const piece = result.captured.toUpperCase();
                if (result.color === 'w') {
                    this.capturedByWhite.push(piece);
                } else {
                    this.capturedByBlack.push(piece);
                }
            }

            return true;
        } catch {
            return false;
        }
    }

    public makeMoveFromSan(san: string): boolean {
        try {
            const result = this.chess.move(san);
            if (!result) return false;

            if (result.captured) {
                const piece = result.captured.toUpperCase();
                if (result.color === 'w') {
                    this.capturedByWhite.push(piece);
                } else {
                    this.capturedByBlack.push(piece);
                }
            }

            return true;
        } catch {
            return false;
        }
    }

    public isGameOver(): boolean {
        return this.chess.isGameOver();
    }

    public getGameOverReason(): string | null {
        if (!this.chess.isGameOver()) return null;
        if (this.chess.isCheckmate()) return 'checkmate';
        if (this.chess.isDraw()) return 'draw';
        if (this.chess.isStalemate()) return 'stalemate';
        if (this.chess.isThreefoldRepetition()) return 'threefold_repetition';
        if (this.chess.isInsufficientMaterial()) return 'insufficient_material';
        return 'unknown';
    }
}