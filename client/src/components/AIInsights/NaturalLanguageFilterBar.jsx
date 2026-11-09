import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

const SUGGESTED_QUERIES = [
  'Stuck on step 4 over 20 min',
  'Failed with quota limit',
  'Runtime over 90 mins',
  'All provisioning environments',
];

export const NaturalLanguageFilterBar = ({
  onApplyAiFilter,
  onClearAiFilter,
  activeAiResult,
  loading,
}) => {
  const [prompt, setPrompt] = useState('');
  const [ungroundedNotice, setUngroundedNotice] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    setUngroundedNotice(null);
    const result = await onApplyAiFilter(prompt);

    if (result && !result.isGrounded) {
      setUngroundedNotice(result.explanation);
    }
  };

  const handleSelectSuggestion = (text) => {
    setPrompt(text);
    setUngroundedNotice(null);
    onApplyAiFilter(text);
  };

  const handleClear = () => {
    setPrompt('');
    setUngroundedNotice(null);
    onClearAiFilter();
  };

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-sky-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask in natural language (e.g. 'show everyone stuck on step 4 over 20 min' or 'failed with quota error')..."
              className="w-full bg-slate-950 border border-slate-750 focus:border-sky-500 rounded pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none transition-colors"
            />

            {prompt && (
              <button
                type="button"
                onClick={() => setPrompt('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white font-medium text-xs font-mono transition-colors shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5" />
            )}
            <span>Filter</span>
          </button>

          {activeAiResult && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-mono transition-colors shrink-0"
            >
              <X className="w-3 h-3 text-rose-400" />
              <span>Clear</span>
            </button>
          )}
        </form>

        {/* Suggestion Chips */}
        {!activeAiResult && !ungroundedNotice && (
          <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-mono text-slate-400 pt-0.5">
            <span className="text-slate-500 shrink-0">Try:</span>
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSelectSuggestion(q)}
                className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-750 text-slate-300 whitespace-nowrap transition-colors"
              >
                "{q}"
              </button>
            ))}
          </div>
        )}

        {/* Active Grounded Filter Banner */}
        {activeAiResult && activeAiResult.isGrounded && (
          <div className="bg-sky-950/40 border border-sky-800/80 rounded px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sky-200">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-medium font-sans">
                {activeAiResult.explanation}
              </span>
              <span className="bg-sky-900/60 text-sky-300 px-1.5 py-0.2 rounded font-mono text-[11px] border border-sky-700/80">
                {activeAiResult.count} matching environments
              </span>
            </div>

            {/* Filter tags breakdown */}
            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
              {Object.entries(activeAiResult.filters || {}).map(([k, v]) => (
                <span
                  key={k}
                  className="bg-slate-850 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700"
                >
                  {k}: <strong className="text-white">{String(v)}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ungrounded Notice Banner */}
        {ungroundedNotice && (
          <div className="bg-amber-950/40 border border-amber-800/80 rounded px-3 py-2 text-xs text-amber-200 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block font-sans">
                  Query Out of Workshop Bounds
                </span>
                <span className="text-amber-300/90 text-[11px] font-sans">
                  {ungroundedNotice}
                </span>
              </div>
            </div>
            <button
              onClick={() => setUngroundedNotice(null)}
              className="text-amber-400 hover:text-amber-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NaturalLanguageFilterBar;
