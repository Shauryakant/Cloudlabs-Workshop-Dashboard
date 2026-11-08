import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Fetch paginated, filtered, searched, and sorted environments
 */
export const fetchEnvironments = async (params = {}) => {
  const cleanParams = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      cleanParams[key] = params[key];
    }
  });

  const response = await apiClient.get('/environments', { params: cleanParams });
  return response.data;
};

/**
 * Fetch workshop session aggregation summary metrics
 */
export const fetchWorkshopSummary = async () => {
  const response = await apiClient.get('/environments/summary');
  return response.data;
};

/**
 * Trigger reprovisioning of a failed environment
 */
export const reprovisionEnvironment = async (id) => {
  const response = await apiClient.post(`/environments/${id}/reprovision`);
  return response.data;
};

export default apiClient;
