import express from 'express';
import {
  getAllEnvironments,
  getEnvironmentById,
  createEnvironment,
  getEnvironmentSummary,
} from '../controllers/environmentController.js';

const router = express.Router();

router.route('/')
  .get(getAllEnvironments)
  .post(createEnvironment);

router.route('/summary')
  .get(getEnvironmentSummary);

router.route('/:id')
  .get(getEnvironmentById);

export default router;
