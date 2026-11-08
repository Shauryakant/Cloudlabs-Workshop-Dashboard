import React from 'react';
import { Search, X, Filter } from 'lucide-react';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'failed', label: 'Failed', alert: true },
  { key: 'in_use', label: 'In Use' },
  { key: 'provisioning', label: 'Provisioning' },
  { key: 'ready', label: 'Ready' },
  { key: 'deprovisioned', label: 'Deprovisioned' },
];

export const FilterBar = ({
  filters,
  summary,
  onUpdateFilter,
  onResetFilters,
}) => {
  const { status, search, sort, order, limit } = filters;

  const getStatusCount = (key) => {
    if (!summary) return 0;
    if (key === '') return summary.totalLearners || 0;
    if (key === 'failed') return summary.failedCount || 0;
    if (key === 'in_use') return summary.inUseCount || 0;
    if (key === 'provisioning') return summary.provisioningCount || 0;
    if (key === 'ready') return summary.readyCount || 0;
    if (key === 'deprovisioned') return summary.deprovisionedCount || 0;
    return 0;
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-slate-400 flex items-center gap-1 font-medium mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" /> Filter:
          </span>

          {STATUS_FILTERS.map((item) => {
            const isSelected = status === item.key;
            const count = getStatusCount(item.key);
            const isFailed = item.key === 'failed';

            return (
              <button
                key={item.key}
                onClick={() => onUpdateFilter('status', item.key)}
                className={`px-2.5 py-1 rounded font-medium border text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? isFailed
                      ? 'bg-rose-950 border-rose-600 text-rose-200'
                      : 'bg-slate-750 border-sky-500 text-white'
                    : isFailed && count > 0
                    ? 'bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900/60'
                    : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-[11px] font-mono px-1 py-0.2 rounded ${
                    isSelected
                      ? 'bg-black/30 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Search + Sort + Limit controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onUpdateFilter('search', e.target.value)}
              placeholder="Search learner, ID, or env..."
              className="w-full bg-slate-950 border border-slate-750 rounded pl-8 pr-7 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs font-mono"
            />
            {search && (
              <button
                onClick={() => onUpdateFilter('search', '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <select
            value={`${sort}-${order}`}
            onChange={(e) => {
              const [newSort, newOrder] = e.target.value.split('-');
              onUpdateFilter('sort', newSort);
              onUpdateFilter('order', newOrder);
            }}
            className="bg-slate-950 border border-slate-750 text-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500 font-mono"
          >
            <option value="createdAt-desc">Default (Created Time)</option>
            <option value="runtimeMinutes-desc">Runtime: High to Low</option>
            <option value="runtimeMinutes-asc">Runtime: Low to High</option>
            <option value="currentStep-desc">Progress: Most Advanced</option>
            <option value="currentStep-asc">Progress: Least Advanced</option>
            <option value="lastActivityAt-desc">Recently Active</option>
            <option value="learnerName-asc">Name: A to Z</option>
          </select>

          {/* Page Limit */}
          <select
            value={limit}
            onChange={(e) => onUpdateFilter('limit', Number(e.target.value))}
            className="bg-slate-950 border border-slate-750 text-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500 font-mono"
          >
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={120}>120 (All)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
