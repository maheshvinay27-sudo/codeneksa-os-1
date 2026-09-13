import React from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  X,
  FileCheck,
} from 'lucide-react';
import { SendWelcomeEmailResult } from '../../services/emailService';

export interface BatchProgressState {
  completed: number;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  currentStudentName?: string;
  isComplete: boolean;
  results: SendWelcomeEmailResult[];
}

interface WelcomeMailProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: BatchProgressState;
}

export const WelcomeMailProgressModal: React.FC<WelcomeMailProgressModalProps> = ({
  isOpen,
  onClose,
  progress,
}) => {
  if (!isOpen) return null;

  const percentage =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div
        id="welcome-mail-progress-modal"
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                progress.isComplete
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-indigo-500/10 text-indigo-400'
              }`}
            >
              {progress.isComplete ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {progress.isComplete
                  ? 'Batch Dispatch Finished'
                  : 'Sending Welcome Emails...'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {progress.completed} / {progress.total} completed ({percentage}%)
              </p>
            </div>
          </div>

          {progress.isComplete && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress.failed > 0 && progress.sent === 0
                    ? 'bg-rose-500'
                    : progress.isComplete
                    ? 'bg-emerald-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            {!progress.isComplete && progress.currentStudentName && (
              <p className="text-[11px] text-slate-400 truncate">
                Processing recipient: <strong className="text-slate-200">{progress.currentStudentName}</strong>
              </p>
            )}
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-emerald-400 block font-semibold">Delivered</span>
              <span className="text-base font-mono font-black text-emerald-400">{progress.sent}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-rose-400 block font-semibold">Failed</span>
              <span className="text-base font-mono font-black text-rose-400">{progress.failed}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-indigo-400 block font-semibold">Skipped</span>
              <span className="text-base font-mono font-black text-indigo-400">{progress.skipped}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-amber-400 block font-semibold">Remaining</span>
              <span className="text-base font-mono font-black text-amber-400">
                {Math.max(0, progress.total - progress.completed)}
              </span>
            </div>
          </div>

          {/* Result Log Stream */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Recent Activity Stream:
            </span>
            <div className="h-44 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-2.5 space-y-1.5 font-mono text-[11px] scrollbar-thin">
              {progress.results.length === 0 ? (
                <div className="text-slate-500 text-center py-6">
                  Initializing batch worker...
                </div>
              ) : (
                progress.results.slice().reverse().map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-1.5 rounded border ${
                      r.success
                        ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
                        : r.errorCode === 'ALREADY_SENT'
                        ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-300'
                        : 'bg-rose-950/30 border-rose-900/50 text-rose-300'
                    }`}
                  >
                    <span className="truncate max-w-[280px]">
                      {r.studentId} • {r.recipientEmail}
                    </span>
                    <span className="font-bold text-[10px]">
                      {r.success ? 'SENT' : r.errorCode || 'FAILED'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            id="btn-close-progress-modal"
            type="button"
            disabled={!progress.isComplete}
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-950 disabled:opacity-40"
          >
            {progress.isComplete ? 'Done & Review Results' : 'Dispatching in Progress...'}
          </button>
        </div>
      </div>
    </div>
  );
};
