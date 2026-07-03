import { Router } from "express";
import { GameController } from "../controllers/GameController.js";

const router: Router = Router();
const gameController = new GameController();

router.post('/move', gameController.handleMove);
router.post('/reset', gameController.resetGame);
router.post('/skip', gameController.handleSkip);

export default router;