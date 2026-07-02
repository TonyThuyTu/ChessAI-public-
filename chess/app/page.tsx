"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

type Status = "playing" | "checkmate" | "draw" | "ai-thinking";

export default function ChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(() => game.fen());
  const [status, setStatus] = useState<Status>("playing");
  const [lastAiReasoning, setLastAiReasoning] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState<"checking" | "online" | "offline">("checking");

  const checkAiHealth = useCallback(async () => {
    setAiStatus("checking");
    try {
      const res = await fetch("/api/health");
      setAiStatus(res.ok ? "online" : "offline");
    } catch {
      setAiStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkAiHealth();
  }, [checkAiHealth]);

  const checkGameOver = useCallback((g: Chess) => {
    if (g.isCheckmate()) return "checkmate";
    if (g.isDraw()) return "draw"; // đã bao gồm stalemate, threefold, insufficient material
    return "playing";
  }, []);

  const requestAiMove = useCallback(async (currentFen: string, g: Chess) => {
    setStatus("ai-thinking");
    try {
      const res = await fetch("/api/ai-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: currentFen }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "AI move failed");
      }

      const { move, reasoning } = await res.json();

      try {
        g.move(move);
      } catch {
        throw new Error(`AI trả về nước đi không hợp lệ: ${move}`);
      }

      setFen(g.fen());
      setHistory((h) => [...h, move]);
      setLastAiReasoning(reasoning);
      setStatus(checkGameOver(g));
    } catch (err) {
      console.error(err);
      setLastAiReasoning("AI failed to respond. Is Ollama running?");
      setStatus("playing");
      setAiStatus("offline");
    }
  }, [checkGameOver]);

  // API mới của react-chessboard v5: onPieceDrop nhận 1 object
  // { piece, sourceSquare, targetSquare } và phải return boolean
  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (aiStatus !== "online") return false;
      if (!targetSquare) return false; // người dùng thả quân ra ngoài bàn cờ

      const g = new Chess(game.fen());

      let move;
      try {
        move = g.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });
      } catch {
        return false;
      }

      if (!move) return false;

      setGame(g);
      setFen(g.fen());
      setHistory((h) => [...h, move.san]);

      const overStatus = checkGameOver(g);
      setStatus(overStatus);

      if (overStatus === "playing") {
        setTimeout(() => requestAiMove(g.fen(), g), 300);
      }

      return true;
    },
    [game, checkGameOver, requestAiMove, aiStatus]
  );

  const resetGame = () => {
    const g = new Chess();
    setGame(g);
    setFen(g.fen());
    setStatus("playing");
    setHistory([]);
    setLastAiReasoning("");
  };

  const statusMessage = useMemo(() => {
    switch (status) {
      case "checkmate": return "Checkmate! Game over.";
      case "draw": return "Draw / stalemate.";
      case "ai-thinking": return "AI is thinking...";
      default: return "Your move (White).";
    }
  }, [status]);

  // Toàn bộ config bàn cờ giờ gộp vào 1 object "options" duy nhất
  const chessboardOptions = {
    position: fen,
    onPieceDrop,
    allowDragging: status === "playing" && aiStatus === "online",
    boardOrientation: "white" as const,
  };

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>Chess vs Local LLM</h1>

      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 99,
        fontSize: 13,
        marginBottom: 8,
        background: aiStatus === "online" ? "#dcfce7" : aiStatus === "offline" ? "#fee2e2" : "#f3f4f6",
        color: aiStatus === "online" ? "#16a34a" : aiStatus === "offline" ? "#dc2626" : "#6b7280",
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: aiStatus === "online" ? "#16a34a" : aiStatus === "offline" ? "#dc2626" : "#9ca3af",
          display: "inline-block",
        }} />
        {aiStatus === "online" && "AI Ready (Ollama)"}
        {aiStatus === "offline" && "Ollama Offline — start Ollama and refresh"}
        {aiStatus === "checking" && "Checking AI..."}
        {aiStatus === "offline" && (
          <button
            onClick={checkAiHealth}
            style={{
              marginLeft: 6,
              fontSize: 12,
              padding: "2px 8px",
              cursor: "pointer",
              border: "1px solid #dc2626",
              borderRadius: 6,
              background: "transparent",
              color: "#dc2626",
            }}
          >
            Retry
          </button>
        )}
      </div>

      <p style={{ color: "#666", marginTop: 0 }}>{statusMessage}</p>

      {/* Kích thước bàn cờ giờ điều khiển bằng width của container, không còn prop boardWidth */}
      <div style={{ width: 560 }}>
        <Chessboard options={chessboardOptions} />
      </div>

      <div style={{ marginTop: 16, padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
        <strong>AI reasoning:</strong>
        <p style={{ margin: "4px 0 0" }}>{lastAiReasoning || "—"}</p>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={resetGame} style={{ padding: "8px 16px", cursor: "pointer" }}>
          New Game
        </button>
        <span style={{ color: "#888", fontSize: 14 }}>{history.length} moves played</span>
      </div>
    </main>
  );
}