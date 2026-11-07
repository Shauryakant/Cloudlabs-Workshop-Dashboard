import mongoose from 'mongoose';
import Environment from '../models/Environment.js';

/**
 * @desc    Get all environments (basic retrieval for Phase 1)
 * @route   GET /api/environments
 * @access  Public
 */
export const getAllEnvironments = async (req, res, next) => {
  try {
    const environments = await Environment.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: environments.length,
      data: environments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get environment by ID (supports MongoDB _id or environmentId)
 * @route   GET /api/environments/:id
 * @access  Public
 */
export const getEnvironmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let environment;
    if (mongoose.Types.ObjectId.isValid(id)) {
      environment = await Environment.findById(id);
    }

    if (!environment) {
      environment = await Environment.findOne({ environmentId: id });
    }

    if (!environment) {
      return res.status(404).json({
        success: false,
        message: `Environment with ID '${id}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: environment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new environment
 * @route   POST /api/environments
 * @access  Public
 */
export const createEnvironment = async (req, res, next) => {
  try {
    const {
      learnerId,
      learnerName,
      email,
      environmentId,
      status,
      currentStep,
      totalSteps,
      stepStartedAt,
      lastActivityAt,
      provisionedAt,
      runtimeMinutes,
      hourlyRate,
      failureReason,
    } = req.body;

    const environment = await Environment.create({
      learnerId,
      learnerName,
      email,
      environmentId,
      status,
      currentStep,
      totalSteps,
      stepStartedAt,
      lastActivityAt,
      provisionedAt,
      runtimeMinutes,
      hourlyRate,
      failureReason,
    });

    res.status(201).json({
      success: true,
      message: 'Environment created successfully',
      data: environment,
    });
  } catch (error) {
    next(error);
  }
};
