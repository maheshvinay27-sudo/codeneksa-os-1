import React from 'react';
import {
  Mail,
  Edit,
  FolderKanban,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Student } from '../../types';

interface StudentActionsProps {
  student: Student;
  onViewBatch?: (batchId: string) => void;
  onViewCollege?: (collegeId: string) => void;
  onSendWelcomeEmail?: (student: Student) => void;
}

export const StudentActions: React.FC<StudentActionsProps> = ({
  student,
  onViewBatch,
  onViewCollege,
  onSendWelcomeEmail,
}) => {
  const hasEmail = Boolean(student.email && student.email.trim().includes('@'));
  const isSent = student.welcomeEmailStatus === 'SENT';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <FolderKanban className="w-4 h-4 text-indigo-400" />
          <span>Section 6 — Student Operations & Actions</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
        {/* View Batch - ACTIVE */}
        <button
          type="button"
          onClick={() => student.batchId && onViewBatch?.(student.batchId)}
          disabled={!student.batchId}
          className="flex items-center justify-between p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 text-slate-200 text-xs font-semibold transition-all group disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <FolderKanban className="w-4 h-4 text-indigo-400" />
            <span>View Batch Details</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
        </button>

        {/* View College - ACTIVE */}
        <button
          type="button"
          onClick={() => student.collegeId && onViewCollege?.(student.collegeId)}
          disabled={!student.collegeId}
          className="flex items-center justify-between p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 text-slate-200 text-xs font-semibold transition-all group disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>View College Record</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
        </button>

        {/* Send Welcome Email - ACTIVE (Phase 5) */}
        <button
          id="btn-profile-send-welcome-email"
          type="button"
          onClick={() => onSendWelcomeEmail?.(student)}
          disabled={!hasEmail}
          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all group ${
            isSent
              ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300 hover:bg-emerald-950/40'
              : hasEmail
              ? 'bg-slate-900 hover:bg-slate-800 border-indigo-500/40 hover:border-indigo-500 text-indigo-200'
              : 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Mail className={`w-4 h-4 ${isSent ? 'text-emerald-400' : 'text-indigo-400'}`} />
            <span>{isSent ? 'Resend Welcome Email' : 'Send Welcome Email'}</span>
          </div>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              isSent
                ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700'
                : 'bg-indigo-950 text-indigo-300 border-indigo-800'
            }`}
          >
            {isSent ? 'SENT' : 'ACTIVE'}
          </span>
        </button>

        {/* Edit Student - Coming Soon */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-slate-400 text-xs cursor-not-allowed opacity-75">
          <div className="flex items-center gap-2.5">
            <Edit className="w-4 h-4 text-slate-500" />
            <span>Edit Student Record</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
};
