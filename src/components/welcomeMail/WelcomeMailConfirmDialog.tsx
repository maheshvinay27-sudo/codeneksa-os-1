import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Send,
  X,
  CheckCircle2,
  Users,
  Info,
  Mail,
  FileText,
} from 'lucide-react';
import { Student, EmailTemplate } from '../../types';

interface WelcomeMailConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onConfirm: (skipAlreadySent: boolean) => void;
  batchId?: string;
  template?: EmailTemplate | null;
}

export const WelcomeMailConfirmDialog: React.FC<WelcomeMailConfirmDialogProps> = ({
  isOpen,
  onClose,
  students,
  onConfirm,
  batchId,
  template,
}) => {
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);

  if (!isOpen) return null;

  const total = students.length;
  const validEmailCount = students.filter(
    (s) => s.email && s.email.trim().includes('@')
  ).length;
  const missingEmailCount = total - validEmailCount;
  const alreadySentCount = students.filter(
    (s) => s.welcomeEmailStatus === 'SENT'
  ).length;
  const readyToSendCount = skipAlreadySent
    ? students.filter(
        (s) =>
          s.email &&
          s.email.trim().includes('@') &&
          s.welcomeEmailStatus !== 'SENT'
      ).length
    : validEmailCount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="welcome-mail-confirm-dialog"
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Confirm Batch Email Dispatch
              </h3>
              <p className="text-xs text-slate-400">
                Review recipient scope and duplicate safeguards
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {batchId && (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Target Batch:</span>
              <span className="font-mono font-bold text-indigo-400">{batchId}</span>
            </div>
          )}

          {/* Breakdown Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">Total Selected</span>
              <span className="text-base font-mono font-black text-slate-100">{total}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-emerald-400 block font-semibold">Valid Emails</span>
              <span className="text-base font-mono font-black text-emerald-400">{validEmailCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-rose-400 block font-semibold">Missing Email</span>
              <span className="text-base font-mono font-black text-rose-400">{missingEmailCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-indigo-400 block font-semibold">Already Sent</span>
              <span className="text-base font-mono font-black text-indigo-400">{alreadySentCount}</span>
            </div>
          </div>

          {/* Duplicate Protection Safeguard */}
          {alreadySentCount > 0 && (
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/60 text-indigo-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-indigo-300">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Duplicate Send Protection Active</span>
              </div>
              <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                {alreadySentCount} students in this batch have already received their official welcome email. To prevent accidental duplicate inbox clutter, they are excluded by default.
              </p>
              <label className="flex items-center gap-2 cursor-pointer pt-1 font-semibold text-xs text-slate-200 select-none">
                <input
                  id="checkbox-skip-already-sent"
                  type="checkbox"
                  checked={skipAlreadySent}
                  onChange={(e) => setSkipAlreadySent(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Skip students who already received welcome email (Recommended)</span>
              </label>
            </div>
          )}

          {missingEmailCount > 0 && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                {missingEmailCount} student records do not have an email address registered. They will be skipped and flagged in the batch audit log.
              </p>
            </div>
          )}

          {/* Saved Custom Message Confirmation */}
          {template && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Custom Message to Send</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/20">
                  Active Saved Message
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                <span className="text-slate-500 font-normal">Subject: </span>
                <span className="text-slate-100 font-semibold">{template.subject}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 max-h-24 overflow-y-auto leading-relaxed whitespace-pre-line">
                {template.body.slice(0, 240)}
                {template.body.length > 240 ? '...' : ''}
              </div>
              <p className="text-[10px] text-slate-500">
                Variables like <span className="text-indigo-300">{"{{studentName}}"}</span> and <span className="text-indigo-300">{"{{studentId}}"}</span> will be dynamically populated for each student in this batch.
              </p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between font-bold">
            <span className="text-slate-300">Effective Emails to Dispatch:</span>
            <span className="text-base font-mono text-indigo-400">{readyToSendCount}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-start-dispatch"
            type="button"
            disabled={readyToSendCount === 0}
            onClick={() => onConfirm(skipAlreadySent)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Confirm & Start Dispatch ({readyToSendCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
