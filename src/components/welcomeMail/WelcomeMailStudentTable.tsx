import React from 'react';
import {
  Mail,
  Send,
  RotateCcw,
  Eye,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserX,
  ShieldCheck,
} from 'lucide-react';
import { Student } from '../../types';

interface WelcomeMailStudentTableProps {
  students: Student[];
  selectedStudentIds: string[];
  onToggleStudent: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onPreviewStudent: (student: Student) => void;
  onSendStudent: (student: Student) => void;
  onRetryStudent: (student: Student) => void;
  onViewHistory: (student: Student) => void;
  sendingStudentId?: string | null;
}

export const WelcomeMailStudentTable: React.FC<WelcomeMailStudentTableProps> = ({
  students,
  selectedStudentIds,
  onToggleStudent,
  onSelectAll,
  onClearSelection,
  onPreviewStudent,
  onSendStudent,
  onRetryStudent,
  onViewHistory,
  sendingStudentId,
}) => {
  const allSelected =
    students.length > 0 && students.every((s) => selectedStudentIds.includes(s.id));
  const someSelected =
    selectedStudentIds.length > 0 && !allSelected;

  const getStatusBadge = (student: Student) => {
    const status = student.welcomeEmailStatus || 'NOT_SENT';
    const hasEmail = Boolean(student.email && student.email.trim().includes('@'));

    if (!hasEmail) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-800/80 text-[10px] font-bold text-rose-300">
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          No Email
        </span>
      );
    }

    switch (status) {
      case 'SENT':
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-[10px] font-bold text-emerald-300 w-fit">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Sent
            </span>
            {student.welcomeEmailSentAt && (
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                {new Date(student.welcomeEmailSentAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-800/80 text-[10px] font-bold text-rose-300 w-fit">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              Failed
            </span>
            {student.welcomeEmailRetryCount ? (
              <span className="text-[10px] text-rose-400/80 font-mono mt-0.5">
                Retried: {student.welcomeEmailRetryCount}x
              </span>
            ) : null}
          </div>
        );
      case 'QUEUED':
      case 'SENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800/80 text-[10px] font-bold text-amber-300 animate-pulse">
            <Clock className="w-3 h-3 text-amber-400" />
            In Transit
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-400">
            <UserX className="w-3 h-3 text-slate-500" />
            Not Sent
          </span>
        );
    }
  };

  return (
    <div id="welcome-mail-student-table-container" className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      {/* Table Action Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 font-semibold">
            <input
              id="checkbox-select-all-students"
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={() => (allSelected ? onClearSelection() : onSelectAll())}
              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Select All Visible ({students.length})</span>
          </label>

          {selectedStudentIds.length > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-bold border border-indigo-500/30">
              {selectedStudentIds.length} selected
            </span>
          )}
        </div>

        {selectedStudentIds.length > 0 && (
          <button
            id="btn-clear-table-selection"
            type="button"
            onClick={onClearSelection}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="p-3 w-10 text-center">#</th>
              <th className="p-3">Student Identity</th>
              <th className="p-3">Email Address</th>
              <th className="p-3">Batch & College</th>
              <th className="p-3">Email Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {students.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No students found matching your filters.
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                const hasValidEmail = Boolean(student.email && student.email.trim().includes('@'));
                const isPermanent =
                  student.studentIdStatus === 'ASSIGNED' ||
                  (student.studentId && student.studentId.startsWith('CKS-'));
                const isSendingThis = sendingStudentId === student.id;

                return (
                  <tr
                    key={student.id}
                    id={`student-mail-row-${student.studentId || student.id}`}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      isSelected ? 'bg-indigo-950/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        id={`checkbox-student-${student.studentId || student.id}`}
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleStudent(student.id)}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                    </td>

                    {/* Identity */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-200">{student.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            isPermanent ? 'text-indigo-400' : 'text-slate-400'
                          }`}
                        >
                          {student.studentId || student.tempStudentId || '—'}
                        </span>
                        {isPermanent && (
                          <ShieldCheck className="w-3 h-3 text-emerald-400" title="Permanent ID" />
                        )}
                      </div>
                      {student.hallTicket && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          HT: {student.hallTicket}
                        </span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="p-3">
                      {hasValidEmail ? (
                        <div className="font-mono text-slate-300 text-xs truncate max-w-[200px]">
                          {student.email}
                        </div>
                      ) : (
                        <span className="text-rose-400/90 text-xs italic">
                          No email registered
                        </span>
                      )}
                      {student.phone && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {student.phone}
                        </div>
                      )}
                    </td>

                    {/* Batch & College */}
                    <td className="p-3">
                      <div className="font-mono text-xs font-semibold text-slate-300">
                        {student.batchId || student.batch || '—'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {student.college || '—'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3">{getStatusBadge(student)}</td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Preview */}
                        <button
                          id={`btn-preview-${student.studentId || student.id}`}
                          type="button"
                          onClick={() => onPreviewStudent(student)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Preview personalized email"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* History */}
                        <button
                          id={`btn-history-${student.studentId || student.id}`}
                          type="button"
                          onClick={() => onViewHistory(student)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="View student email history"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        {/* Send or Retry */}
                        {student.welcomeEmailStatus === 'FAILED' ? (
                          <button
                            id={`btn-retry-${student.studentId || student.id}`}
                            type="button"
                            onClick={() => onRetryStudent(student)}
                            disabled={!hasValidEmail || isSendingThis}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all disabled:opacity-50"
                            title="Retry failed email dispatch"
                          >
                            <RotateCcw className={`w-3 h-3 ${isSendingThis ? 'animate-spin' : ''}`} />
                            <span>Retry</span>
                          </button>
                        ) : student.welcomeEmailStatus === 'SENT' ? (
                          <button
                            id={`btn-resend-${student.studentId || student.id}`}
                            type="button"
                            onClick={() => onSendStudent(student)}
                            disabled={!hasValidEmail || isSendingThis}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-[11px] flex items-center gap-1 transition-all disabled:opacity-50"
                            title="Resend welcome email (Already Sent)"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Resend</span>
                          </button>
                        ) : (
                          <button
                            id={`btn-send-${student.studentId || student.id}`}
                            type="button"
                            onClick={() => onSendStudent(student)}
                            disabled={!hasValidEmail || isSendingThis}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-sm shadow-indigo-950 disabled:opacity-50"
                            title="Send welcome email"
                          >
                            <Send className={`w-3 h-3 ${isSendingThis ? 'animate-pulse' : ''}`} />
                            <span>Send</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
