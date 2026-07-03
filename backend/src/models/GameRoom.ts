import { Chess } from 'chess.js';

const PIECE_VALUE: Record<string, number> = {
    p: 1, n: 2, b: 3, r: 4, q: 5, k: 6,
};

export class GameRoom {
    public chess: Chess;
    public capturedByWhite: string[];
    public capturedByBlack: string[];
    private boardHistory: number[][][];

    constructor() {
        this.chess = new Chess();
        this.capturedByWhite = [];
        this.capturedByBlack = [];
        this.boardHistory = [this.snapshotBoard()]; // lưu initial state
    }

    private snapshotBoard(): number[][] {
        return this.chess.board().map(row =>
            row.map(cell => {
                if (!cell) return 0;
                const val = PIECE_VALUE[cell.type];
                return cell.color === 'w' ? val : -val;
            })
        );
    }

    public getFen(): string {
        return this.chess.fen();
    }

    public getHistory(): string[] {
        return this.chess.history();
    }

    public getBoardHistory(): number[][][] {
        return this.boardHistory;
    }

    public makeMove(from: string, to: string, promotion = 'q'): boolean {
        try {
            const result = this.chess.move({ from, to, promotion });
            if (!result) return false;

            if (result.captured) {
                const piece = result.captured.toUpperCase();
                if (result.color === 'w') {
                    this.capturedByWhite.push(piece);
                } else {
                    this.capturedByBlack.push(piece);
                }
            }

            this.boardHistory.push(this.snapshotBoard());
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

            this.boardHistory.push(this.snapshotBoard());
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