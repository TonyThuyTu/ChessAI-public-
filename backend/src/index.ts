import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GameController } from './controllers/GameController.js';

dotenv.config();

const app = express();

const gameController = new GameController();

app.use(cors());
app.use(express.json());

// 1. THÊM ROUTE HEALTH CHECK NÀY VÀO BACKEND
app.get('/api/health', (req, res) => {
    // Trả về trạng thái 200 OK để Frontend biết Server Node.js đang online
    res.status(200).json({ status: 'online', timestamp: new Date() });
});

// 2. Thêm một route phụ để xử lý nút "New Game" bên Frontend (nếu bạn muốn đồng bộ reset bàn cờ)
app.post('/api/game/reset', (req, res) => {
    // Logic reset bàn cờ trên server của bạn nếu cần
    res.status(200).json({ message: 'Bàn cờ đã được khởi tạo lại thành công!' });
});

app.post('/api/game/move', gameController.handleMove);

// Khởi chạy server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`[server]: Server đang chạy thành công tại http://localhost:${PORT}`);
});