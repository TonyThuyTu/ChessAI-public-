"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { gameService } from "@/services/gameServices";
import axios from "axios";

type Status = "playing" | "checkmate" | "draw" | "ai-thinking";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function ChessGame() {
  // Chỉ quản lý giao diện qua chuỗi FEN và trạng thái trận đấu
  const [fen, setFen] = useState<string>(START_FEN);
  const [status, setStatus] = useState<Status>("playing");
  const [lastAiReasoning, setLastAiReasoning] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState<"checking" | "online" | "offline">("checking");

  // Kiểm tra Health Check của Backend Node.js
  const checkAiHealth = useCallback(async () => {
    setAiStatus("checking");
    try {
      const res = await fetch("http://localhost:5000/api/health"); 
      setAiStatus(res.ok ? "online" : "offline");
    } catch {
      setAiStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkAiHealth();
  }, [checkAiHealth]);

  // API mới của react-chessboard v5
  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (aiStatus !== "online" || status === "ai-thinking" || status !== "playing") return false;
      if (!targetSquare) return false; 

      // 🌟 KHỞI TẠO BẢN SAO TỪ CHUỖI FEN HIỆN TẠI (Không dùng state game cũ nữa)
      const currentChess = new Chess(fen);
      
      try {
        const move = currentChess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });
        if (!move) return false;
      } catch {
        return false; // Đi sai luật cờ -> tự nảy về chỗ cũ
      }

      // 1. Cập nhật ngay lập tức nước đi của Player lên giao diện
      const nextFen = currentChess.fen();
      setFen(nextFen);
      setHistory((h) => [...h, `[PLAYER]: ${sourceSquare} -> ${targetSquare}`]);
      setStatus("ai-thinking");

      // 2. Âm thầm gửi nước đi lên Backend bằng Axios
      gameService.sendMove({ from: sourceSquare, to: targetSquare })
        .then((data) => {
          // Backend trả về FEN tổng mới (gồm cả nước AI đi)
          const aiChess = new Chess(data.fen);
          setFen(data.fen); // Vẽ lại bàn cờ theo FEN chuẩn từ BE
          setHistory(data.logs); // Đồng bộ log sạch từ BE
          setLastAiReasoning(data.reasoning || "AI di chuyển thành công.");
          
          // Kiểm tra trạng thái trận đấu
          if (aiChess.isCheckmate()) setStatus("checkmate");
          else if (aiChess.isDraw()) setStatus("draw");
          else setStatus("playing");
        })
        .catch((err) => {
          console.error(err);
          setLastAiReasoning("Lỗi hệ thống. Đang hoàn tác nước đi...");
          
          // Nếu BE lỗi, hoàn tác bàn cờ về FEN trước khi kéo quân
          setFen(fen); 
          setStatus("playing");
          
          if (axios.isAxiosError(err) && err.response?.status === 400) {
             alert(err.response.data.error || "Nước đi không hợp lệ!");
          }
        });

      return true; 
    },
    [fen, aiStatus, status] // 🌟 Dependency array giờ theo dõi sát chuỗi FEN hiện tại
  );

  const resetGame = async () => {
    try {
      setStatus("ai-thinking");
      await gameService.resetServerGame(); // Reset trên Backend trước
      
      // Sau đó làm sạch toàn bộ State ở Frontend về mặc định
      setFen(START_FEN);
      setStatus("playing");
      setHistory([]);
      setLastAiReasoning("Trận đấu mới đã được thiết lập.");
    } catch (e) {
      console.error("Lỗi đồng bộ reset:", e);
      alert("Không thể kết nối server để tạo trận mới!");
      setStatus("playing");
    }
  };

  const statusMessage = useMemo(() => {
    switch (status) {
      case "checkmate": return "Checkmate! Game over.";
      case "draw": return "Draw / stalemate.";
      case "ai-thinking": return "AI (Gemini) is thinking...";
      default: return "Your move (White).";
    }
  }, [status]);

  const chessboardOptions = {
    position: fen,
    onPieceDrop,
    allowDragging: status === "playing" && aiStatus === "online",
    boardOrientation: "white" as const,
  };

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>Chess vs Gemini AI</h1>

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
        {aiStatus === "online" && "Gemini AI Ready (Node.js BE)"}
        {aiStatus === "offline" && "Server Offline — hãy khởi chạy backend Node.js"}
        {aiStatus === "checking" && "Checking AI..."}
        {aiStatus === "offline" && (
          <button onClick={checkAiHealth} style={{ marginLeft: 6, fontSize: 12, padding: "2px 8px", cursor: "pointer", border: "1px solid #dc2626", borderRadius: 6, background: "transparent", color: "#dc2626" }}>
            Retry
          </button>
        )}
      </div>

      <p style={{ color: "#666", marginTop: 0 }}>{statusMessage}</p>

      <div style={{ width: 560 }}>
        <Chessboard options={chessboardOptions} />
      </div>

      <div style={{ marginTop: 16, padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
        <strong>AI reasoning & Logs:</strong>
        <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#333", whiteSpace: "pre-line" }}>
          {lastAiReasoning || "—"}
        </p>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={resetGame} style={{ padding: "8px 16px", cursor: "pointer", borderRadius: 4, border: "1px solid #ccc" }}>
          New Game
        </button>
        <span style={{ color: "#888", fontSize: 14 }}>{history.length} nước đi đã ghi nhận</span>
      </div>
    </main>
  );
}