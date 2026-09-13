import React from 'react';
import { X, ShieldCheck, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Student } from '../../types';

interface StudentProfileHeaderProps {
  student: Student;
  onClose: () => void;
}

export const StudentProfileHeader: React.FC<StudentProfileHeaderProps> = ({
  student,
  onClose,
}) => {
  const isPermanent =
    student.studentIdStatus === 'ASSIGNED' ||
    (student.studentId && student.studentId.startsWith('CKS-'));

  const getStatusBadge = (status: string = 'active') => {
    switch (status.toLowerCase()) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        );
      case 'graduated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Graduated
          </span>
        );
      case 'dropped':
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            {status.toUpperCase()}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="p-6 border-b border-slate-800 bg-slate-900/90 relative">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
              Student 360° Profile
            </span>
            {getStatusBadge(student.status)}
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {student.name}
          </h2>

          <div className="flex items-center gap-2 mt-2">
            {isPermanent ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 text-sm font-mono font-bold">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                {student.studentId}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Pending Permanent ID
              </div>
            )}

            {student.tempStudentId && (
              <span className="text-xs font-mono text-slate-400">
                Ref: {student.tempStudentId}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
          title="Close profile (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
