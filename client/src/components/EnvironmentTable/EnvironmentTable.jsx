import React from 'react';
import StatusBadge from '../StatusBadge/StatusBadge.jsx';
import {
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle,
  Inbox,
  Loader2,
} from 'lucide-react';

export const EnvironmentTable = ({
  environments = [],
  loading,
  reprovisioningId,
  onReprovision,
}) => {
  if (loading && environments.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
        <span className="font-mono text-xs">Loading workshop environments...</span>
      </div>
    );
  }

  if (environments.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-2 border-b border-slate-800">
        <Inbox className="w-8 h-8 text-slate-600" />
        <span className="text-sm font-medium text-slate-400">No environments match current filter</span>
        <span className="text-xs font-mono">Try adjusting your search query or status filter.</span>
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        {/* Sticky Table Header */}
        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider sticky top-0 z-10 select-none">
          <tr className="bg-slate-900">
            <th className="py-2.5 px-3 font-semibold bg-slate-900">Learner</th>
            <th className="py-2.5 px-3 font-semibold bg-slate-900">Environment</th>
            <th className="py-2.5 px-3 font-semibold bg-slate-900">Status</th>
            <th className="py-2.5 px-3 font-semibold bg-slate-900">Progress</th>
            <th className="py-2.5 px-3 font-semibold bg-slate-900">Time on Step</th>
            <th className="py-2.5 px-3 font-semibold text-right bg-slate-900">Runtime</th>
            <th className="py-2.5 px-3 font-semibold text-right bg-slate-900">Spend</th>
            <th className="py-2.5 px-3 font-semibold text-right bg-slate-900">Action</th>
          </tr>
        </thead>

        {/* Dense Table Body */}
        <tbody className="divide-y divide-slate-800/80 font-sans">
          {environments.map((env) => {
            const isFailed = env.status === 'failed';
            const isReprovisioning = reprovisioningId === env.environmentId || reprovisioningId === env._id;

            // Calculate duration on current step in minutes
            const stepStarted = env.stepStartedAt ? new Date(env.stepStartedAt).getTime() : now;
            const minutesOnStep = Math.max(0, Math.floor((now - stepStarted) / 60000));

            // A learner is considered stuck if active in_use and on same step for >= 20 mins
            const isStuck = env.status === 'in_use' && minutesOnStep >= 20;

            // Completion percentage
            const completion = env.totalSteps > 0
              ? Math.min(100, Math.round((env.currentStep / env.totalSteps) * 100))
              : 0;

            const hourlyRate = env.hourlyRate || 1.50;
            const spend = ((env.runtimeMinutes || 0) / 60) * hourlyRate;

            return (
              <tr
                key={env._id || env.environmentId}
                className={`transition-colors hover:bg-slate-850/60 ${
                  isFailed
                    ? 'bg-rose-950/20 hover:bg-rose-950/30'
                    : isStuck
                    ? 'bg-amber-950/15 hover:bg-amber-950/25'
                    : 'odd:bg-slate-900/30 even:bg-slate-950/30'
                }`}
              >
                {/* Learner Info */}
                <td className="py-2 px-3">
                  <div className="font-medium text-slate-100 flex items-center gap-1.5">
                    <span>{env.learnerName}</span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-850 px-1 py-0.2 rounded border border-slate-750">
                      {env.learnerId}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">
                    {env.email}
                  </div>
                </td>

                {/* Environment ID */}
                <td className="py-2 px-3 font-mono text-xs text-slate-300">
                  <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {env.environmentId}
                  </span>
                </td>

                {/* Status Badge */}
                <td className="py-2 px-3 whitespace-nowrap">
                  <StatusBadge status={env.status} />
                  {isFailed && env.failureReason && (
                    <div
                      className="text-[11px] text-rose-300 font-mono mt-1 max-w-xs truncate cursor-help"
                      title={env.failureReason}
                    >
                      <AlertTriangle className="w-3 h-3 inline mr-1 text-rose-400" />
                      {env.failureReason}
                    </div>
                  )}
                </td>

                {/* Step Progress */}
                <td className="py-2 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-200">
                      Step {env.currentStep} <span className="text-slate-500">/ {env.totalSteps}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      ({completion}%)
                    </span>
                  </div>
                  <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        completion === 100
                          ? 'bg-emerald-500'
                          : isFailed
                          ? 'bg-rose-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </td>

                {/* Time on Step / Stuck Alert */}
                <td className="py-2 px-3 whitespace-nowrap font-mono text-xs">
                  {env.status === 'in_use' ? (
                    isStuck ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-700 text-amber-200 font-medium animate-pulse">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span className="tabular-nums">{minutesOnStep}m on step</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 tabular-nums">
                        {minutesOnStep}m on step
                      </span>
                    )
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>

                {/* Runtime */}
                <td className="py-2 px-3 text-right font-mono text-xs tabular-nums text-slate-300 whitespace-nowrap">
                  {env.runtimeMinutes}m
                </td>

                {/* Estimated Spend */}
                <td className="py-2 px-3 text-right font-mono text-xs tabular-nums font-medium text-slate-200 whitespace-nowrap">
                  ${spend.toFixed(2)}
                </td>

                {/* Action Column */}
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  {isFailed ? (
                    <button
                      onClick={() => onReprovision(env.environmentId || env._id)}
                      disabled={isReprovisioning}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-medium text-xs font-mono transition-colors disabled:opacity-50 shadow-sm"
                      title="Reprovision this failed Azure environment"
                    >
                      <RotateCcw className={`w-3 h-3 ${isReprovisioning ? 'animate-spin' : ''}`} />
                      <span>{isReprovisioning ? 'Reprovisioning...' : 'Reprovision'}</span>
                    </button>
                  ) : (
                    <span className="text-slate-600 font-mono text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EnvironmentTable;
