import { executeNaturalLanguageQuery } from '../services/aiService.js';

/**
 * @desc    Process natural language search query and filter workshop environments
 * @route   POST /api/ai/filter
 * @access  Public
 */
export const naturalLanguageFilterHandler = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A text query is required in request body { query: string }',
      });
    }

    const result = await executeNaturalLanguageQuery(query);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
