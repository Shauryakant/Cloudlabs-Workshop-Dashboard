import express from 'express';
import { naturalLanguageFilterHandler } from '../controllers/aiController.js';

const router = express.Router();

router.post('/filter', naturalLanguageFilterHandler);

export default router;
