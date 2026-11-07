import express from 'express';
import {
  getAllEnvironments,
  getEnvironmentById,
  createEnvironment,
} from '../controllers/environmentController.js';

const router = express.Router();

router.route('/')
  .get(getAllEnvironments)
  .post(createEnvironment);

router.route('/:id')
  .get(getEnvironmentById);

export default router;
