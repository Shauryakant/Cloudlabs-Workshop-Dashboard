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
