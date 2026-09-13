import React from 'react';
import {
  FolderKanban,
  Building2,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertTriangle,
  MailCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Batch, WelcomeMailBatchStats } from '../../types';

interface WelcomeMailBatchSelectorProps {
  batches: Batch[];
  selectedBatchId: string;
  stats: Record<string, WelcomeMailBatchStats>;
  onSelectBatch: (batchId: string) => void;
  onDispatchBatch?: (batchId: string) => void;
}

export const WelcomeMailBatchSelector: React.FC<WelcomeMailBatchSelectorProps> = ({
  batches,
  selectedBatchId,
  stats,
  onSelectBatch,
  onDispatchBatch,
}) => {
  const currentStat = stats[selectedBatchId];

  return (
    <div id="welcome-mail-batch-selector-card" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <FolderKanban className="w-4 h-4 text-indigo-400" />
          <span>Batch Selection & Scope</span>
        </div>

        {/* Batch Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="select-email-batch" className="text-xs text-slate-400 font-medium">
            Active Batch:
          </label>
          <select
            id="select-email-batch"
            value={selectedBatchId}
            onChange={(e) => onSelectBatch(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="">-- All Batches / Global View --</option>
            {batches.map((b) => (
              <option key={b.id || b.batchId} value={b.batchId || b.id}>
                {b.batchId || b.id} — {b.name || b.college || 'Cohort'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Batch Summary Card */}
      {selectedBatchId && currentStat ? (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-100 font-mono">
                  {currentStat.batchId}
                </span>
                <span className="text-xs text-slate-400 font-medium">• {currentStat.batchName}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {currentStat.collegeName}
                </span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                  {currentStat.courseTitle}
                </span>
              </div>
            </div>

            {onDispatchBatch && (
              <button
                id="btn-prepare-batch-dispatch"
                type="button"
                onClick={() => onDispatchBatch(selectedBatchId)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-950"
              >
                <span>Prepare Batch Dispatch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Batch Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-500 block font-semibold">Total Students</span>
              <span className="font-mono text-slate-200 font-bold text-sm">
                {currentStat.totalStudents}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-emerald-400 block font-semibold flex items-center gap-1">
                <MailCheck className="w-3 h-3" /> Valid Emails
              </span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {currentStat.studentsWithEmail}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-rose-400 block font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> No Email
              </span>
              <span className="font-mono text-rose-400 font-bold text-sm">
                {currentStat.studentsWithoutEmail}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-indigo-400 block font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Already Sent
              </span>
              <span className="font-mono text-indigo-300 font-bold text-sm">
                {currentStat.alreadySentCount}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-amber-400 block font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pending
              </span>
              <span className="font-mono text-amber-300 font-bold text-sm">
                {currentStat.pendingCount + (currentStat.totalStudents - currentStat.alreadySentCount - currentStat.failedCount - currentStat.pendingCount)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
          Showing all students across all batches. Select a specific batch above to inspect cohort dispatch statistics.
        </div>
      )}
    </div>
  );
};
