import React from 'react';
import {
  Activity,
  ShieldCheck,
  Mail,
  Clock,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { Student } from '../../types';

interface StudentOperationalStatusProps {
  student: Student;
}

export const StudentOperationalStatus: React.FC<StudentOperationalStatusProps> = ({
  student,
}) => {
  const isPermanent =
    student.studentIdStatus === 'ASSIGNED' ||
    (student.studentId && student.studentId.startsWith('CKS-'));

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-6">
      {/* Section 4: Operational Employee Statuses */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span>Section 4 — Operational Pipeline Status</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Student ID Status */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400">
                Student ID Employee
              </span>
              <ShieldCheck
                className={`w-4 h-4 ${
                  isPermanent ? 'text-emerald-400' : 'text-amber-400'
                }`}
              />
            </div>
            <div className="text-xs font-bold">
              {isPermanent ? (
                <span className="text-emerald-400">
                  Assigned ({student.studentId})
                </span>
              ) : (
                <span className="text-amber-400">Pending Assignment</span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {isPermanent ? 'Phase 3 completed' : 'Requires Phase 3 run'}
            </div>
          </div>

          {/* Welcome Email Status */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400">
                Welcome Mail Employee
              </span>
              <Mail
                className={`w-4 h-4 ${
                  student.welcomeEmailStatus === 'SENT'
                    ? 'text-emerald-400'
                    : student.welcomeEmailStatus === 'FAILED'
                    ? 'text-rose-400'
                    : student.welcomeEmailStatus === 'QUEUED'
                    ? 'text-amber-400'
                    : 'text-slate-500'
                }`}
              />
            </div>
            <div className="text-xs font-bold">
              {student.welcomeEmailStatus === 'SENT' ? (
                <span className="text-emerald-400">Sent</span>
              ) : student.welcomeEmailStatus === 'FAILED' ? (
                <span className="text-rose-400">Delivery Failed</span>
              ) : student.welcomeEmailStatus === 'QUEUED' ? (
                <span className="text-amber-400">In Transit</span>
              ) : (
                <span className="text-slate-400">Not Dispatched</span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {student.welcomeEmailSentAt
                ? formatDate(student.welcomeEmailSentAt)
                : student.welcomeEmailStatus === 'FAILED'
                ? `Retry count: ${student.welcomeEmailRetryCount || 0}`
                : 'Ready for Phase 5 dispatch'}
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: System Audit & Derived State */}
      <div className="space-y-3 pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>Section 5 — System Information & Metadata</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-400">Record Created:</span>
            <span className="font-mono text-slate-200 text-[11px]">
              {formatDate(student.createdAt)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-400">Last Modified:</span>
            <span className="font-mono text-slate-200 text-[11px]">
              {formatDate(student.updatedAt)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-400">ID Assigned At:</span>
            <span className="font-mono text-slate-200 text-[11px]">
              {formatDate(student.studentIdAssignedAt)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-400">ID Assigned By:</span>
            <span className="font-mono text-slate-200 text-[11px]">
              {student.studentIdAssignedBy || '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
