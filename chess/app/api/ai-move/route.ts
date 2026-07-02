import { NextRequest, NextResponse } from "next/server";
import { getAiMove } from "@/lib/chess-ai";

export async function POST(req: Request) {
  try {
    const { fen } = await req.json();

    if (!fen || typeof fen !== "string") {
      return Response.json({ error: "Missing or invalid 'fen'." }, { status: 400 });
    }

    const { move, reasoning } = await getAiMove(fen);
    return Response.json({ move, reasoning });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}