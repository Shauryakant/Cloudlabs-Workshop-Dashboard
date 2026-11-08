import React from 'react';
import useEnvironments from '../hooks/useEnvironments.js';
import SummaryBar from '../components/Summary/SummaryBar.jsx';
import FilterBar from '../components/FilterBar/FilterBar.jsx';
import EnvironmentTable from '../components/EnvironmentTable/EnvironmentTable.jsx';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Dashboard = () => {
  const {
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
    refetch,
  } = useEnvironments(6000); // 6s polling interval

  const { page, limit, totalPages, total, hasNextPage, hasPrevPage } = pagination;

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(total, page * limit);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30">
      {/* 1. Operational Command Header */}
      <SummaryBar
        summary={summary}
        refreshing={refreshing}
        isPolling={isPolling}
        setIsPolling={setIsPolling}
        onRefresh={refetch}
      />

      {/* 2. Filter Toolbar */}
      <FilterBar
        filters={filters}
        summary={summary}
        onUpdateFilter={updateFilter}
        onResetFilters={resetFilters}
      />

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`max-w-7xl mx-auto w-full px-4 py-2 my-2 text-xs font-mono rounded flex items-center justify-between border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/60 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        </div>
      )}

      {/* Global Fetch Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto w-full px-4 py-3 my-2 text-xs font-mono rounded bg-rose-950/80 border border-rose-700 text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Connection error: {error}</span>
          </div>
          <button
            onClick={refetch}
            className="px-2 py-1 bg-rose-800 hover:bg-rose-700 rounded text-white text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Main Data Table */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-3 flex flex-col">
        <div className="bg-slate-900 border border-slate-800 rounded-md shadow-lg overflow-hidden flex-1 flex flex-col">
          <EnvironmentTable
            environments={environments}
            loading={loading}
            reprovisioningId={reprovisioningId}
            onReprovision={reprovision}
          />

          {/* 4. Table Pagination Footer */}
          <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono mt-auto select-none">
            <div>
              Showing <span className="text-slate-200 font-semibold">{startRecord}</span> to{' '}
              <span className="text-slate-200 font-semibold">{endRecord}</span> of{' '}
              <span className="text-slate-200 font-semibold">{total}</span> environments
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => updateFilter('page', page - 1)}
                disabled={!hasPrevPage || loading}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="text-slate-300 font-medium px-2">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => updateFilter('page', page + 1)}
                disabled={!hasNextPage || loading}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
