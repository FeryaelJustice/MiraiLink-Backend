import express from 'express';
import { getAllAnimes, getAllGames } from '../controllers/catalog.controller.js';

const router = express.Router();

router.get('/animes', getAllAnimes);
router.get('/games', getAllGames);

export default router;
