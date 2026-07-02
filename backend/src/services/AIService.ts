import { GoogleGenAI } from '@google/genai';

export class AIService {
    private ai: GoogleGenAI;

    constructor() {
        // Tự động lấy GEMINI_API_KEY từ file .env
        this.ai = new GoogleGenAI({ apiKey: process.env.OPENAI_API_KEY || "gemini" });
    }

    public async getBestMove(fen: string, possibleMoves: any[]): Promise<{ from: string; to: string }> {
        const movesList = possibleMoves.map(m => `${m.from}-${m.to}`);

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash', // Tối ưu tốc độ phản hồi siêu nhanh cho game
            contents: `FEN hiện tại: ${fen}. Các nước đi hợp lệ: ${movesList.join(', ')}`,
            config: {
                responseMimeType: 'application/json',
                systemInstruction: `
                    Bạn là một động cơ cờ vua máy tính. Hãy phân tích chuỗi FEN và CHỌN một nước đi tối ưu nhất trong danh sách các nước đi hợp lệ.
                    Trả về DUY NHẤT cấu trúc JSON: {"from": "ô_đi", "to": "ô_đến"}
                    Không giải thích hay thêm ký tự nào khác ngoài JSON.
                `
            }
        });

        const textOutput = response.text;
        if (!textOutput) throw new Error("AI không phản hồi.");

        return JSON.parse(textOutput);
    }
}