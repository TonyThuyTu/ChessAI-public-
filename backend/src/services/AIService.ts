import OpenAI from 'openai';

interface GameContext {
    fen: string;
    legalMoves: string[];
    moveHistory: string[];
    capturedByWhite: string[];
    capturedByBlack: string[];
}

export class AIService {
    private client: OpenAI;
    private model: string;

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || '',
            baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        });
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }

    public async getBestMove(context: GameContext): Promise<{ san: string }> {
        const {
            fen,
            legalMoves = [],
            moveHistory = [],
            capturedByWhite = [],
            capturedByBlack = [],
        } = context;

        if (legalMoves.length === 0) {
            throw new Error('Không có nước đi hợp lệ.');
        }

        const historyText = moveHistory.length > 0
            ? moveHistory.join(', ')
            : 'Chưa có nước đi nào';

        const capturedText = [
            capturedByWhite.length > 0 ? `Trắng ăn: ${capturedByWhite.join(', ')}` : '',
            capturedByBlack.length > 0 ? `Đen ăn: ${capturedByBlack.join(', ')}` : '',
        ].filter(Boolean).join(' | ') || 'Chưa có quân nào bị ăn';

        console.log(`\x1b[33m[AI →]\x1b[0m Đang gọi model: ${this.model}`);

        const response = await this.client.chat.completions.create({
            model: this.model,
            temperature: 0.3,
            max_tokens: 500,
            messages: [
                {
                    role: 'system',
                    content: `You are a chess engine. Pick the best move from the legal moves list.
                    RULES:
                    - You MUST pick exactly one move from the legal moves list
                    - Do NOT invent moves or alter notation
                    - Respond ONLY with valid JSON: {"san": "<move>"}
                    - No explanation, no extra text`,
                },
                {
                    role: 'user',
                    content: `FEN: ${fen}
                    Move history: ${historyText}
                    Captured pieces: ${capturedText}
                    Legal moves: ${legalMoves.join(', ')}

                    Pick the best move. JSON only.`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        const message = response.choices[0]?.message as any;
        const content = message?.content || message?.resoning_content || '';

        // Log raw để debug
        console.log('[AI RAW]', JSON.stringify(response.choices[0]?.message, null, 2));
        console.log('[AI usage]', response.usage);

        if (!content) throw new Error('AI không phản hồi.');

        // Strip markdown nếu AI trả về ```json ... ```
        const cleaned = content
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();

        const parsed = JSON.parse(cleaned);

        

        console.log(`\x1b[32m[AI 200]\x1b[0m Model: ${response.model} | Tokens: ${response.usage?.total_tokens} | Move: ${parsed.san}`);

        if (!legalMoves.includes(parsed.san)) {
            console.warn(`\x1b[33m[AI WARN]\x1b[0m Nước không hợp lệ: ${parsed.san}, fallback: ${legalMoves[0]}`);
            return { san: legalMoves[0] };
        }

        return { san: parsed.san };

        
    }
}