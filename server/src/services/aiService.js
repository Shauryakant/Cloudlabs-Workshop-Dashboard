import { Groq } from 'groq-sdk';
import Environment, { ENVIRONMENT_STATUSES } from '../models/Environment.js';

// Allowed filter fields for security allowlist
const ALLOWED_FILTER_KEYS = [
  'status',
  'currentStep',
  'minStep',
  'maxStep',
  'minRuntime',
  'maxRuntime',
  'stuckDurationMinutes',
  'failureKeyword',
  'search',
];

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Deterministic fallback parser when Groq LLM is unreachable or key is missing.
 */
const fallbackDeterministicParser = (prompt) => {
  const lower = prompt.toLowerCase().trim();
  const filters = {};
  let explanation = 'Rule-based filter applied (offline fallback mode)';
  let isGrounded = false;

  // 1. Status detection
  for (const st of ENVIRONMENT_STATUSES) {
    if (lower.includes(st) || (st === 'in_use' && (lower.includes('in use') || lower.includes('active')))) {
      filters.status = st;
      isGrounded = true;
    }
  }

  // 2. Stuck learners (e.g. "stuck on step 4 for over 20 minutes")
  const stuckMatch = lower.match(/stuck(?:.*step\s*(\d+))?(?:.*(?:over|for|>|more than)\s*(\d+)\s*(?:min|m))?/i);
  if (stuckMatch) {
    isGrounded = true;
    filters.status = 'in_use';
    if (stuckMatch[1]) filters.currentStep = parseInt(stuckMatch[1], 10);
    filters.stuckDurationMinutes = stuckMatch[2] ? parseInt(stuckMatch[2], 10) : 20;
    explanation = `Filtering for learners in_use${filters.currentStep ? ` on step ${filters.currentStep}` : ''} stuck for >= ${filters.stuckDurationMinutes}m.`;
  }

  // 3. Step detection (e.g. "step 3" or "on step 5")
  const stepMatch = lower.match(/(?:step|level)\s*(\d+)/i);
  if (stepMatch && !filters.currentStep) {
    filters.currentStep = parseInt(stepMatch[1], 10);
    isGrounded = true;
    explanation = `Filtering learners currently on step ${filters.currentStep}.`;
  }

  // 4. Failure keywords
  const failKeywords = ['quota', 'subnet', 'timeout', 'nsg', 'ip', 'key vault', 'storage'];
  for (const kw of failKeywords) {
    if (lower.includes(kw)) {
      filters.status = 'failed';
      filters.failureKeyword = kw;
      isGrounded = true;
      explanation = `Filtering failed environments matching error keyword "${kw}".`;
      break;
    }
  }

  // 5. Runtime criteria (e.g. "runtime > 60" or "over 90 mins runtime")
  const runtimeMatch = lower.match(/(?:runtime|running)\s*(?:>|over|more than)\s*(\d+)/i);
  if (runtimeMatch) {
    filters.minRuntime = parseInt(runtimeMatch[1], 10);
    isGrounded = true;
    explanation = `Filtering environments running for >= ${filters.minRuntime} minutes.`;
  }

  if (!isGrounded) {
    return {
      isGrounded: false,
      explanation:
        'This query does not match workshop environment parameters. You can filter by status (e.g. failed, in_use), step number, stuck duration (e.g. stuck > 20m), or failure errors.',
      filters: {},
    };
  }

  return { isGrounded, explanation, filters };
};

/**
 * Compile natural-language user query into an allowlisted, sanitized filter specification using Groq.
 */
export const compileNaturalLanguageFilter = async (userPrompt) => {
  const promptText = (userPrompt || '').trim();

  if (!promptText) {
    return {
      isGrounded: false,
      explanation: 'Please provide a search filter query.',
      filters: {},
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  const modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  // If no API key configured, use deterministic fallback
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return fallbackDeterministicParser(promptText);
  }

  try {
    const groq = new Groq({ apiKey });

    const systemPrompt = `You are a strict, grounded Natural Language Filter compiler for a live Azure Cloud Workshop Operations Dashboard.
Your job is to convert instructor search requests into a restricted JSON filter object.

GROUNDING RULES:
1. ONLY map requests that ask about workshop environment telemetry:
   - status: must be one of ["provisioning", "ready", "in_use", "failed", "deprovisioned"]
   - currentStep: integer 0-8
   - minStep: integer 0-8
   - maxStep: integer 0-8
   - minRuntime: integer minutes
   - maxRuntime: integer minutes
   - stuckDurationMinutes: integer minutes on current step
   - failureKeyword: string keyword in failure reason (e.g. "quota", "subnet", "timeout", "ip")
   - search: string (learner name, learner ID, or environment ID)

2. IF THE QUERY CANNOT BE ANSWERED using workshop environment telemetry (e.g., general knowledge questions, opinions, chit-chat, or unrelated concepts):
   Set "isGrounded": false
   Set "explanation": "This query does not contain actionable workshop environment criteria. You can search by status, step progress, stuck duration, runtime, or failure reason."
   Set "filters": {}

3. OUTPUT FORMAT:
Return pure valid JSON with NO markdown code fences, NO thoughts, NO surrounding text:
{
  "isGrounded": true,
  "explanation": "Clear 1-sentence explanation of what is being filtered",
  "filters": { ...allowed fields only... }
}`;

    const completion = await groq.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptText },
      ],
      temperature: 0.1,
      max_tokens: 350,
    });

    const rawContent = completion.choices[0]?.message?.content?.trim() || '';

    // Strip markdown code fences if present
    const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // If parsing fails, fall back gracefully
      return fallbackDeterministicParser(promptText);
    }

    if (!parsed || typeof parsed !== 'object') {
      return fallbackDeterministicParser(promptText);
    }

    // Security & Allowlist Enforcement: Drop any keys that are not explicitly permitted
    const validatedFilters = {};
    if (parsed.filters && typeof parsed.filters === 'object') {
      for (const key of Object.keys(parsed.filters)) {
        if (ALLOWED_FILTER_KEYS.includes(key)) {
          validatedFilters[key] = parsed.filters[key];
        }
      }
    }

    return {
      isGrounded: Boolean(parsed.isGrounded),
      explanation: parsed.explanation || 'Filtered workshop environments',
      filters: validatedFilters,
    };
  } catch (error) {
    console.warn(`[AI Service] Groq error (${error.message}). Using deterministic fallback parser.`);
    return fallbackDeterministicParser(promptText);
  }
};

/**
 * Execute natural language query by compiling filters and executing a safe MongoDB query.
 */
export const executeNaturalLanguageQuery = async (userPrompt) => {
  const { isGrounded, explanation, filters } = await compileNaturalLanguageFilter(userPrompt);

  if (!isGrounded || Object.keys(filters).length === 0) {
    return {
      success: true,
      isGrounded: false,
      explanation,
      filters: {},
      count: 0,
      data: [],
    };
  }

  // Construct safe Mongoose query internally — NO user or LLM code injection
  const query = {};

  // Status
  if (filters.status && ENVIRONMENT_STATUSES.includes(filters.status.toLowerCase())) {
    query.status = filters.status.toLowerCase();
  }

  // Step
  if (filters.currentStep !== undefined && filters.currentStep !== null) {
    query.currentStep = parseInt(filters.currentStep, 10);
  } else if (filters.minStep !== undefined || filters.maxStep !== undefined) {
    query.currentStep = {};
    if (filters.minStep !== undefined) query.currentStep.$gte = parseInt(filters.minStep, 10);
    if (filters.maxStep !== undefined) query.currentStep.$lte = parseInt(filters.maxStep, 10);
  }

  // Runtime
  if (filters.minRuntime !== undefined || filters.maxRuntime !== undefined) {
    query.runtimeMinutes = {};
    if (filters.minRuntime !== undefined) query.runtimeMinutes.$gte = parseInt(filters.minRuntime, 10);
    if (filters.maxRuntime !== undefined) query.runtimeMinutes.$lte = parseInt(filters.maxRuntime, 10);
  }

  // Stuck duration (time on current step >= X minutes)
  if (filters.stuckDurationMinutes !== undefined && parseInt(filters.stuckDurationMinutes, 10) > 0) {
    const mins = parseInt(filters.stuckDurationMinutes, 10);
    const thresholdDate = new Date(Date.now() - mins * 60 * 1000);
    query.stepStartedAt = { $lte: thresholdDate };
    if (!query.status) {
      query.status = 'in_use'; // stuck only applies to active learners
    }
  }

  // Failure Keyword
  if (filters.failureKeyword) {
    query.status = 'failed';
    query.failureReason = { $regex: escapeRegex(String(filters.failureKeyword)), $options: 'i' };
  }

  // General search
  if (filters.search) {
    const sRegex = new RegExp(escapeRegex(String(filters.search)), $options = 'i');
    query.$or = [{ learnerName: sRegex }, { learnerId: sRegex }, { environmentId: sRegex }];
  }

  // Execute query
  const environments = await Environment.find(query).sort({ lastActivityAt: -1 }).limit(100);

  return {
    success: true,
    isGrounded: true,
    explanation,
    filters,
    count: environments.length,
    data: environments,
  };
};
