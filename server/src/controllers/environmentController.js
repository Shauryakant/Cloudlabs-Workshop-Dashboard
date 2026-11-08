import {
  queryEnvironments,
  findEnvironmentById,
  createNewEnvironment,
  getWorkshopSummary,
  reprovisionEnvironment,
} from '../services/environmentService.js';

/**
 * @desc    Get all environments with pagination, filtering, search, and sorting
 * @route   GET /api/environments
 * @access  Public
 * @query   page, limit, status, search, sort, order
 */
export const getAllEnvironments = async (req, res, next) => {
  try {
    const { page, limit, status, search, sort, order } = req.query;

    const result = await queryEnvironments({
      page,
      limit,
      status,
      search,
      sort,
      order,
    });

    res.status(200).json({
      success: true,
      count: result.environments.length,
      pagination: result.pagination,
      data: result.environments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get environment by ID (MongoDB _id or environmentId)
 * @route   GET /api/environments/:id
 * @access  Public
 */
export const getEnvironmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const environment = await findEnvironmentById(id);

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
 * @desc    Get aggregated session summary statistics
 * @route   GET /api/environments/summary
 * @access  Public
 */
export const getEnvironmentSummary = async (req, res, next) => {
  try {
    const summary = await getWorkshopSummary();

    res.status(200).json({
      success: true,
      data: summary,
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
    const environment = await createNewEnvironment(req.body);

    res.status(201).json({
      success: true,
      message: 'Environment created successfully',
      data: environment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reprovision a failed environment
 * @route   POST /api/environments/:id/reprovision
 * @access  Public
 */
export const reprovisionEnvironmentHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await reprovisionEnvironment(id);

    if (result.error === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    if (result.error === 'INVALID_STATUS') {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Environment reprovisioning initiated successfully',
      data: result.environment,
    });
  } catch (error) {
    next(error);
  }
};
