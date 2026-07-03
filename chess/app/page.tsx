"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { gameService } from "@/services/gameServices";
import axios from "axios";

type Status = "playing" | "checkmate" | "draw" | "stalemate" | "ai-thinking";
type Winner = "player" | "ai" | null;

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const SKIP_AFTER_SECONDS = 30;

export default function ChessGame() {
  const [fen, setFen] = useState<string>(START_FEN);
  const [status, setStatus] = useState<Status>("playing");
  const [winner, setWinner] = useState<Winner>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [capturedByWhite, setCapturedByWhite] = useState<string[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<string[]>([]);
  const [lastAiMove, setLastAiMove] = useState<string>("");
  const [aiStatus, setAiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [skipTimer, setSkipTimer] = useState<number>(SKIP_AFTER_SECONDS);
  const [gameStarted, setGameStarted] = useState<boolean>(false);

  // Ref để lock tức thì, không chờ React re-render
  const isLockedRef = useRef<boolean>(false);
  const skipIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Health check ────────────────────────────────────────────────────────────

  const checkAiHealth = useCallback(async () => {
    setAiStatus("checking");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/health`
      );
      setAiStatus(res.ok ? "online" : "offline");
    } catch {
      setAiStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkAiHealth();
  }, [checkAiHealth]);

  // ─── Xử lý response chung ────────────────────────────────────────────────────

  const handleGameResponse = useCallback(
    (data: Awaited<ReturnType<typeof gameService.sendMove>>) => {
      setFen(data.fen);
      setHistory(data.history);
      setCapturedByWhite(data.capturedByWhite);
      setCapturedByBlack(data.capturedByBlack);
      setLastAiMove(data.aiMove || "");
      setWinner(data.winner ?? null);

      if (data.gameOver) {
        if (data.reason === "checkmate") setStatus("checkmate");
        else if (data.reason === "stalemate") setStatus("stalemate");
        else setStatus("draw");
      } else {
        setStatus("playing");
      }
    },
    []
  );

  // ─── Skip timer — chỉ chạy khi đang lượt player VÀ game đã bắt đầu ─────────

  const startSkipTimer = useCallback(() => {
    if (skipIntervalRef.current) clearInterval(skipIntervalRef.current);
    setSkipTimer(SKIP_AFTER_SECONDS);
    skipIntervalRef.current = setInterval(() => {
      setSkipTimer((t) => {
        if (t <= 1) {
          clearInterval(skipIntervalRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  const stopSkipTimer = useCallback(() => {
    if (skipIntervalRef.current) clearInterval(skipIntervalRef.current);
    setSkipTimer(SKIP_AFTER_SECONDS);
  }, []);

  useEffect(() => {
    if (status === "playing" && aiStatus === "online" && gameStarted) {
      startSkipTimer();
    } else {
      stopSkipTimer();
    }
    return () => {
      if (skipIntervalRef.current) clearInterval(skipIntervalRef.current);
    };
  }, [status, aiStatus, gameStarted, startSkipTimer, stopSkipTimer]);

  // ─── Auto skip khi timer về 0 — chỉ khi game đã bắt đầu ─────────────────────

  useEffect(() => {
    if (skipTimer === 0 && status === "playing" && aiStatus === "online" && gameStarted) {
      handleSkip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipTimer]);

  // ─── Handle Skip ─────────────────────────────────────────────────────────────

  const handleSkip = useCallback(async () => {
    if (status !== "playing" || aiStatus !== "online") return;
    if (isLockedRef.current) return;

    isLockedRef.current = true;
    stopSkipTimer();
    setStatus("ai-thinking");

    try {
      const data = await gameService.skipTurn();
      handleGameResponse(data);
    } catch (err) {
      console.error("[SKIP ERROR]", err);
      setStatus("playing");
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        // Backend đang xử lý request khác, không cần alert
        console.warn("[SKIP] Backend busy (409), bỏ qua.");
      }
    } finally {
      isLockedRef.current = false;
    }
  }, [status, aiStatus, handleGameResponse, stopSkipTimer]);

  // ─── Piece drop ──────────────────────────────────────────────────────────────

  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (aiStatus !== "online" || status !== "playing") return false;
      if (!targetSquare) return false;
      if (isLockedRef.current) return false;

      // Validate move locally trước
      const currentChess = new Chess(fen);
      try {
        const move = currentChess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });
        if (!move) return false;
      } catch {
        return false;
      }

      // Lock ngay lập tức
      isLockedRef.current = true;
      const prevFen = fen;
      setFen(currentChess.fen()); // optimistic update
      setStatus("ai-thinking");
      setGameStarted(true);
      stopSkipTimer();

      gameService
        .sendMove({ from: sourceSquare, to: targetSquare })
        .then((data) => {
          handleGameResponse(data);
        })
        .catch((err) => {
          console.error("[MOVE ERROR]", err);
          // Rollback UI về state trước
          setFen(prevFen);
          setStatus("playing");

          if (axios.isAxiosError(err)) {
            if (err.response?.status === 409) {
              // Backend busy — rollback thầm lặng
              console.warn("[MOVE] Backend busy (409), rollback.");
            } else if (err.response?.status === 400) {
              alert(err.response.data.error || "Nước đi không hợp lệ!");
            } else {
              alert("Lỗi kết nối server.");
            }
          }
        })
        .finally(() => {
          isLockedRef.current = false;
        });

      return true;
    },
    [fen, aiStatus, status, handleGameResponse, stopSkipTimer]
  );

  // ─── Reset game ───────────────────────────────────────────────────────────────

  const resetGame = async () => {
    try {
      stopSkipTimer();
      isLockedRef.current = false;
      setGameStarted(false);
      setStatus("ai-thinking");

      await gameService.resetServerGame();

      setFen(START_FEN);
      setStatus("playing");
      setWinner(null);
      setHistory([]);
      setCapturedByWhite([]);
      setCapturedByBlack([]);
      setLastAiMove("");
    } catch {
      alert("Không thể kết nối server để tạo trận mới!");
      setStatus("playing");
      isLockedRef.current = false;
    }
  };

  // ─── Derived UI ───────────────────────────────────────────────────────────────

  const statusMessage = useMemo(() => {
    switch (status) {
      case "checkmate":
        return winner === "player" ? "Checkmate! Bạn thắng! 🎉" : "Checkmate! AI thắng. 🤖";
      case "stalemate":
        return "Stalemate! Hoà cờ.";
      case "draw":
        return "Draw! Hoà cờ.";
      case "ai-thinking":
        return "AI đang suy nghĩ...";
      default:
        return "Lượt của bạn (Trắng).";
    }
  }, [status, winner]);

  const isGameOver =
    status === "checkmate" || status === "draw" || status === "stalemate";

  const pieceSymbol: Record<string, string> = {
    P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔",
    p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
  };

  const renderCaptured = (pieces: string[]) =>
    pieces.map((p, i) => (
      <span key={i} style={{ fontSize: 18 }}>
        {pieceSymbol[p] ?? p}
      </span>
    ));

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>Chess vs AI</h1>

      {/* AI Status Badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 99,
          fontSize: 13,
          marginBottom: 8,
          background:
            aiStatus === "online"
              ? "#dcfce7"
              : aiStatus === "offline"
              ? "#fee2e2"
              : "#f3f4f6",
          color:
            aiStatus === "online"
              ? "#16a34a"
              : aiStatus === "offline"
              ? "#dc2626"
              : "#6b7280",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            display: "inline-block",
            background:
              aiStatus === "online"
                ? "#16a34a"
                : aiStatus === "offline"
                ? "#dc2626"
                : "#9ca3af",
          }}
        />
        {aiStatus === "online" && "AI Ready"}
        {aiStatus === "offline" && "Server Offline — hãy khởi chạy backend"}
        {aiStatus === "checking" && "Đang kiểm tra..."}
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

      {/* Status message */}
      <p
        style={{
          color: isGameOver ? "#b91c1c" : status === "ai-thinking" ? "#d97706" : "#555",
          fontWeight: isGameOver ? 600 : 400,
          marginTop: 0,
        }}
      >
        {statusMessage}
      </p>

      {/* Quân đen bị trắng ăn */}
      <div style={{ minHeight: 28, marginBottom: 4 }}>
        {renderCaptured(capturedByWhite)}
      </div>

      {/* Bàn cờ */}
      <div style={{ width: 560 }}>
        <Chessboard
          options={{
            position: fen,
            onPieceDrop,
            allowDragging: status === "playing" && aiStatus === "online" && !isLockedRef.current,
            boardOrientation: "white",
          }}
        />
      </div>

      {/* Quân trắng bị đen ăn */}
      <div style={{ minHeight: 28, marginTop: 4 }}>
        {renderCaptured(capturedByBlack)}
      </div>

      {/* AI move info */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: "#f5f5f5",
          borderRadius: 8,
          fontSize: 14,
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>AI vừa đi:</strong> {lastAiMove || "—"}
        </p>
      </div>

      {/* Lịch sử nước đi */}
      <div
        style={{
          marginTop: 8,
          padding: 12,
          background: "#f5f5f5",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        <strong>Lịch sử ({history.length} nước):</strong>
        <div
          style={{
            marginTop: 6,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: 2,
          }}
        >
          {history.map((move, i) => (
            <span
              key={i}
              style={{
                padding: "2px 6px",
                borderRadius: 4,
                background: i % 2 === 0 ? "#e5e7eb" : "#d1d5db",
                fontSize: 12,
              }}
            >
              {Math.floor(i / 2) + 1}
              {i % 2 === 0 ? "." : "..."} {move}
            </span>
          ))}
        </div>
        {history.length === 0 && (
          <p style={{ margin: "4px 0 0", color: "#9ca3af" }}>Chưa có nước đi nào.</p>
        )}
      </div>

      {/* Controls */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={resetGame}
          disabled={status === "ai-thinking"}
          style={{
            padding: "8px 16px",
            cursor: status === "ai-thinking" ? "not-allowed" : "pointer",
            borderRadius: 4,
            border: "1px solid #ccc",
            opacity: status === "ai-thinking" ? 0.5 : 1,
          }}
        >
          New Game
        </button>

        {/* Skip button — chỉ hiện khi đến lượt player và game đã bắt đầu */}
        {status === "playing" && aiStatus === "online" && gameStarted && (
          <button
            onClick={handleSkip}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              borderRadius: 4,
              fontWeight: 600,
              border: `1px solid ${skipTimer <= 10 ? "#ef4444" : "#f59e0b"}`,
              color: skipTimer <= 10 ? "#ef4444" : "#d97706",
              transition: "all 0.3s",
            }}
          >
            Skip ({skipTimer}s)
          </button>
        )}

        <button
          onClick={checkAiHealth}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        >
          Check Server
        </button>
      </div>
    </main>
  );
}