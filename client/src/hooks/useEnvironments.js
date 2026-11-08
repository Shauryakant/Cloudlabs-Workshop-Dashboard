import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchEnvironments,
  fetchWorkshopSummary,
  reprovisionEnvironment as apiReprovision,
} from '../services/api.js';

const DEFAULT_FILTERS = {
  page: 1,
  limit: 20,
  status: '',
  search: '',
  sort: 'createdAt',
  order: 'desc',
};

export const useEnvironments = (pollingIntervalMs = 6000) => {
  const [environments, setEnvironments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [reprovisioningId, setReprovisioningId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [isPolling, setIsPolling] = useState(true);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const isMountedRef = useRef(true);

  /**
   * Primary data fetching routine
   */
  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const [envsRes, summaryRes] = await Promise.all([
        fetchEnvironments(filtersRef.current),
        fetchWorkshopSummary(),
      ]);

      if (isMountedRef.current) {
        if (envsRes.success) {
          setEnvironments(envsRes.data || []);
          if (envsRes.pagination) {
            setPagination(envsRes.pagination);
          }
        }
        if (summaryRes.success) {
          setSummary(summaryRes.data);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('[useEnvironments] Fetch error:', err);
        setError(
          err.response?.data?.message || err.message || 'Failed to load workshop data'
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Fetch when filters change
  useEffect(() => {
    loadData(false);
  }, [filters, loadData]);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    loadData(true);

    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  // Background polling timer
  useEffect(() => {
    if (!isPolling || pollingIntervalMs <= 0) return;

    const interval = setInterval(() => {
      // Don't poll if browser tab is backgrounded
      if (document.hidden) return;
      loadData(false);
    }, pollingIntervalMs);

    return () => clearInterval(interval);
  }, [isPolling, pollingIntervalMs, loadData]);

  /**
   * Update a specific filter key (e.g. status, search, page)
   */
  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // Reset page to 1 on filter or search changes
      if (key !== 'page') {
        next.page = 1;
      }
      return next;
    });
  }, []);

  /**
   * Reset all filters to default
   */
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  /**
   * Reprovision a failed environment
   */
  const reprovision = useCallback(
    async (id) => {
      try {
        setReprovisioningId(id);
        setActionMessage(null);

        const res = await apiReprovision(id);

        if (res.success) {
          setActionMessage({
            type: 'success',
            text: `Reprovision initiated for ${id}. Status changed to provisioning.`,
          });
          // Refresh list immediately so state change reflects
          await loadData(false);
        }
      } catch (err) {
        setActionMessage({
          type: 'error',
          text:
            err.response?.data?.message ||
            `Failed to reprovision environment ${id}`,
        });
      } finally {
        setReprovisioningId(null);
      }
    },
    [loadData]
  );

  return {
    environments,
    summary,
    pagination,
    filters,
    loading,
    refreshing,
    error,
    reprovisioningId,
    actionMessage,
    isPolling,
    setIsPolling,
    updateFilter,
    resetFilters,
    reprovision,
    refetch: () => loadData(false),
  };
};

export default useEnvironments;
