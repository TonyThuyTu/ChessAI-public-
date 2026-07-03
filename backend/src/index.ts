import dotenv from 'dotenv';
dotenv.config(); // ← PHẢI trên đầu tiên

import express from 'express';
import cors from 'cors';
import gameRoutes from './Routes/game.routes.js';
import { httpLogger, errorLogger } from './middlewares/logger.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(httpLogger);

app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'online', timestamp: new Date() });
});

app.use('/api/game', gameRoutes); // ← thêm / ở đầu

app.use(errorLogger);
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\x1b[32m[SERVER]\x1b[0m Running at http://localhost:${PORT}`);
});