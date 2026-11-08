import mongoose from 'mongoose';
import Environment, { ENVIRONMENT_STATUSES } from '../models/Environment.js';

// Allowed fields for sorting to prevent query injection
const ALLOWED_SORT_FIELDS = [
  'runtimeMinutes',
  'currentStep',
  'lastActivityAt',
  'createdAt',
  'learnerName',
  'status',
  'hourlyRate',
];

/**
 * Escapes regex special characters to prevent ReDoS / injection
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Query environments with server-side pagination, status filtering, multi-field search, and sorting.
 *
 * @param {Object} queryOptions
 * @param {number} [queryOptions.page=1] - 1-based page index
 * @param {number} [queryOptions.limit=20] - Records per page (max 100)
 * @param {string} [queryOptions.status] - Filter by status
 * @param {string} [queryOptions.search] - Search across learnerName, learnerId, environmentId
 * @param {string} [queryOptions.sort='createdAt'] - Field to sort by
 * @param {string} [queryOptions.order='desc'] - Sort direction ('asc' or 'desc')
 * @returns {Promise<{ environments: Array, pagination: Object }>}
 */
export const queryEnvironments = async ({
  page = 1,
  limit = 20,
  status,
  search,
  sort = 'createdAt',
  order = 'desc',
} = {}) => {
  // 1. Sanitize pagination inputs
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  // 2. Build MongoDB query filter
  const filter = {};

  // Status filter
  if (status && status.trim()) {
    const trimmedStatus = status.trim().toLowerCase();
    if (ENVIRONMENT_STATUSES.includes(trimmedStatus)) {
      filter.status = trimmedStatus;
    }
  }

  // Multi-field search
  if (search && search.trim()) {
    const sanitizedSearch = escapeRegex(search.trim());
    const searchRegex = new RegExp(sanitizedSearch, 'i');
    filter.$or = [
      { learnerName: searchRegex },
      { learnerId: searchRegex },
      { environmentId: searchRegex },
    ];
  }

  // 3. Build sort options
  const sortField = ALLOWED_SORT_FIELDS.includes(sort) ? sort : 'createdAt';
  const sortDirection = order === 'asc' ? 1 : -1;
  const sortOptions = { [sortField]: sortDirection };

  // 4. Execute queries in parallel for performance
  const [total, environments] = await Promise.all([
    Environment.countDocuments(filter),
    Environment.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parsedLimit),
  ]);

  const totalPages = Math.ceil(total / parsedLimit) || 1;

  return {
    environments,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
      hasNextPage: parsedPage < totalPages,
      hasPrevPage: parsedPage > 1,
    },
  };
};

/**
 * Retrieve an environment by MongoDB _id or business environmentId
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const findEnvironmentById = async (id) => {
  if (!id) return null;

  if (mongoose.Types.ObjectId.isValid(id)) {
    const env = await Environment.findById(id);
    if (env) return env;
  }

  return Environment.findOne({ environmentId: id });
};

/**
 * Create a new environment document
 *
 * @param {Object} environmentData
 * @returns {Promise<Object>}
 */
export const createNewEnvironment = async (environmentData) => {
  return Environment.create(environmentData);
};

/**
 * Reprovision a failed environment.
 * Validates that the environment exists and is currently in 'failed' status.
 * Resets status to 'provisioning', clears failure reason, updates provisioning timestamps.
 *
 * @param {string} id - Environment _id or environmentId
 * @returns {Promise<{ error?: string, message?: string, environment?: Object }>}
 */
export const reprovisionEnvironment = async (id) => {
  const environment = await findEnvironmentById(id);

  if (!environment) {
    return {
      error: 'NOT_FOUND',
      message: `Environment with identifier '${id}' not found`,
    };
  }

  // Safety check: Only failed environments are allowed to be reprovisioned
  if (environment.status !== 'failed') {
    return {
      error: 'INVALID_STATUS',
      message: `Cannot reprovision environment in '${environment.status}' status. Only 'failed' environments can be reprovisioned.`,
    };
  }

  const now = new Date();
  environment.status = 'provisioning';
  environment.failureReason = null;
  environment.provisionedAt = now;
  environment.stepStartedAt = now;
  environment.lastActivityAt = now;

  await environment.save();

  return { environment };
};

/**
 * Calculate workshop-wide session statistics using MongoDB aggregation pipeline.
 * All computations (counts, spend math, averages) execute in the database.
 *
 * @returns {Promise<Object>} Aggregated session summary
 */
export const getWorkshopSummary = async () => {
  const result = await Environment.aggregate([
    {
      $group: {
        _id: null,
        totalLearners: { $sum: 1 },
        provisioningCount: {
          $sum: { $cond: [{ $eq: ['$status', 'provisioning'] }, 1, 0] },
        },
        readyCount: {
          $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] },
        },
        inUseCount: {
          $sum: { $cond: [{ $eq: ['$status', 'in_use'] }, 1, 0] },
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        deprovisionedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'deprovisioned'] }, 1, 0] },
        },
        totalEstimatedSpend: {
          $sum: {
            $multiply: [
              { $divide: [{ $ifNull: ['$runtimeMinutes', 0] }, 60] },
              { $ifNull: ['$hourlyRate', 0] },
            ],
          },
        },
        averageRuntimeMinutes: {
          $avg: { $ifNull: ['$runtimeMinutes', 0] },
        },
        averageCompletionPercentage: {
          $avg: {
            $multiply: [
              {
                $divide: [
                  { $ifNull: ['$currentStep', 0] },
                  { $cond: [{ $gt: ['$totalSteps', 0] }, '$totalSteps', 1] },
                ],
              },
              100,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalLearners: 1,
        provisioningCount: 1,
        readyCount: 1,
        inUseCount: 1,
        failedCount: 1,
        deprovisionedCount: 1,
        totalEstimatedSpend: { $round: ['$totalEstimatedSpend', 2] },
        averageRuntimeMinutes: { $round: ['$averageRuntimeMinutes', 1] },
        averageCompletionPercentage: { $round: ['$averageCompletionPercentage', 1] },
      },
    },
  ]);

  // Handle empty database case gracefully with sensible zeroes
  if (!result || result.length === 0) {
    return {
      totalLearners: 0,
      provisioningCount: 0,
      readyCount: 0,
      inUseCount: 0,
      failedCount: 0,
      deprovisionedCount: 0,
      totalEstimatedSpend: 0,
      averageRuntimeMinutes: 0,
      averageCompletionPercentage: 0,
    };
  }

  return result[0];
};
