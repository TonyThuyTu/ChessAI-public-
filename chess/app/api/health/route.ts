const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/version`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return Response.json({ status: "offline" }, { status: 503 });
    }

    return Response.json({ status: "online" });
  } catch {
    return Response.json({ status: "offline" }, { status: 503 });
  }
}