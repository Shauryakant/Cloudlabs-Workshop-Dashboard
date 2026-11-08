import React from 'react';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Play,
  Pause,
  AlertTriangle,
  Server,
} from 'lucide-react';

export const SummaryBar = ({
  summary,
  refreshing,
  isPolling,
  setIsPolling,
  onRefresh,
}) => {
  const {
    totalLearners = 0,
    inUseCount = 0,
    failedCount = 0,
    provisioningCount = 0,
    readyCount = 0,
    deprovisionedCount = 0,
    totalEstimatedSpend = 0,
    averageCompletionPercentage = 0,
    averageRuntimeMinutes = 0,
  } = summary || {};

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 text-slate-200 sticky top-0 z-20 backdrop-blur-none">
      {/* Top utility row */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-100 tracking-tight">
            CloudLabs Operations
          </span>
          <span className="text-slate-500 font-mono">/</span>
          <span className="text-slate-400 font-medium">
            Azure Workshop (120 Learners)
          </span>
        </div>

        {/* Polling controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono transition-colors ${
              isPolling
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-750'
                : 'bg-slate-800/50 border-slate-850 text-slate-400 hover:bg-slate-800'
            }`}
            title={isPolling ? 'Pause real-time updates' : 'Resume real-time updates'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPolling ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            {isPolling ? 'Live (6s)' : 'Paused'}
            {isPolling ? <Pause className="w-3 h-3 ml-0.5" /> : <Play className="w-3 h-3 ml-0.5" />}
          </button>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750 disabled:opacity-50 text-xs transition-colors"
            title="Manual sync with MongoDB Atlas"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Main metrics strip */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
        {/* State counters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 mr-1">Status:</span>

          <span className="px-2 py-1 bg-slate-800/80 border border-slate-700 rounded text-slate-200 font-mono">
            Total <strong className="text-white font-semibold ml-1">{totalLearners}</strong>
          </span>

          <span className="px-2 py-1 bg-emerald-950/60 border border-emerald-800/80 rounded text-emerald-300 font-mono">
            In Use <strong className="text-emerald-100 font-semibold ml-1">{inUseCount}</strong>
          </span>

          <span className="px-2 py-1 bg-sky-950/60 border border-sky-800/80 rounded text-sky-300 font-mono">
            Provisioning <strong className="text-sky-100 font-semibold ml-1">{provisioningCount}</strong>
          </span>

          <span className="px-2 py-1 bg-slate-800/80 border border-slate-700 rounded text-slate-300 font-mono">
            Ready <strong className="text-white font-semibold ml-1">{readyCount}</strong>
          </span>

          <span
            className={`px-2 py-1 rounded font-mono border transition-colors ${
              failedCount > 0
                ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                : 'bg-slate-800/50 border-slate-700 text-slate-400'
            }`}
          >
            <span className="inline-flex items-center gap-1">
              {failedCount > 0 && <AlertTriangle className="w-3 h-3 text-rose-400" />}
              Failed <strong className="font-semibold ml-0.5">{failedCount}</strong>
            </span>
          </span>

          <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 font-mono">
            Done <strong className="text-zinc-200 font-semibold ml-1">{deprovisionedCount}</strong>
          </span>
        </div>

        {/* Aggregated financial and progress metrics */}
        <div className="flex items-center gap-5 font-mono">
          {/* Cloud Spend */}
          <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded border border-slate-700/80">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 text-xs">Estimated Spend:</span>
            <span className="text-slate-100 font-bold tabular-nums">
              ${totalEstimatedSpend.toFixed(2)}
            </span>
          </div>

          {/* Average Completion */}
          <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded border border-slate-700/80">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 text-xs">Avg Completion:</span>
            <span className="text-slate-100 font-bold tabular-nums">
              {averageCompletionPercentage}%
            </span>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden ml-1">
              <div
                className="h-full bg-sky-500 rounded-full"
                style={{ width: `${Math.min(100, averageCompletionPercentage)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SummaryBar;
