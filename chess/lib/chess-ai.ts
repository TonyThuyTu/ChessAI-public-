import { Chess } from "chess.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:3b";

interface OllamaResponse {
  response: string;
}

export async function getAiMove(fen: string): Promise<{ move: string; reasoning: string }> {
  const chess = new Chess(fen);
  const legalMoves = chess.moves();

  if (legalMoves.length === 0) {
    throw new Error("No legal moves available (game over).");
  }

  const prompt = buildPrompt(fen, legalMoves);

  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
  }

  const data: OllamaResponse = await res.json();
  return parseMoveFromResponse(data.response, legalMoves);
}

function buildPrompt(fen: string, legalMoves: string[]): string {
  return `You are a chess AI playing a game. Here is the current board state in FEN notation:

${fen}

Here is the list of ALL legal moves you may choose from (SAN notation):
${legalMoves.join(", ")}

Pick the best move from this exact list. You MUST copy one move exactly as written above — do not invent a new move or alter notation.

Respond in this exact format:
MOVE: <the move>
REASON: <one short sentence explaining why>`;
}

function parseMoveFromResponse(
  text: string,
  legalMoves: string[]
): { move: string; reasoning: string } {
  const moveMatch = text.match(/MOVE:\s*([^\n]+)/i);
  const reasonMatch = text.match(/REASON:\s*([^\n]+)/i);

  const candidate = moveMatch?.[1]?.trim();
  const reasoning = reasonMatch?.[1]?.trim() || "No reasoning given.";

  if (candidate && legalMoves.includes(candidate)) {
    return { move: candidate, reasoning };
  }

  const found = legalMoves.find((m) => text.includes(m));
  if (found) {
    return { move: found, reasoning };
  }

  const fallback = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  return {
    move: fallback,
    reasoning: "AI response was unparseable, picked a random legal move as fallback.",
  };
}