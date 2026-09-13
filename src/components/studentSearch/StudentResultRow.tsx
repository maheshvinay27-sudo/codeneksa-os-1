import React from 'react';
import { ExternalLink, Mail, Phone, Building2, User, Hash } from 'lucide-react';
import { Student } from '../../types';

interface StudentResultRowProps {
  student: Student;
  onOpenProfile: (student: Student) => void;
}

export const StudentResultRow: React.FC<StudentResultRowProps> = ({
  student,
  onOpenProfile,
}) => {
  const isPermanent =
    student.studentIdStatus === 'ASSIGNED' ||
    (student.studentId && student.studentId.startsWith('CKS-'));

  const getStatusBadge = (status: string = 'active') => {
    switch (status.toLowerCase()) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        );
      case 'graduated':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Graduated
          </span>
        );
      case 'dropped':
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {status.toUpperCase()}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Pending
          </span>
        );
    }
  };

  return (
    <tr
      onClick={() => onOpenProfile(student)}
      className="group hover:bg-slate-800/50 border-b border-slate-800/80 transition-colors cursor-pointer"
    >
      {/* Codeneksa Student ID */}
      <td className="py-3 px-3.5 whitespace-nowrap">
        {isPermanent ? (
          <div>
            <span className="inline-flex items-center font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 group-hover:border-indigo-500/60 transition-colors">
              {student.studentId}
            </span>
            {student.tempStudentId && student.tempStudentId !== student.studentId && (
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Ref: {student.tempStudentId}
              </div>
            )}
          </div>
        ) : (
          <div>
            <span className="inline-flex items-center font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Pending ID
            </span>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Ref: {student.tempStudentId || student.studentId}
            </div>
          </div>
        )}
      </td>

      {/* Student Name */}
      <td className="py-3 px-3.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-xs font-bold text-slate-300 group-hover:border-indigo-500/40">
            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
            {student.name}
          </span>
        </div>
      </td>

      {/* Hall Ticket Number */}
      <td className="py-3 px-3.5 whitespace-nowrap">
        <span className="font-mono text-xs text-slate-300 font-medium">
          {student.hallTicketNumber || '—'}
        </span>
      </td>

      {/* College */}
      <td className="py-3 px-3.5 whitespace-nowrap max-w-[160px] truncate text-xs text-slate-300" title={student.college}>
        {student.college || '—'}
      </td>

      {/* Course */}
      <td className="py-3 px-3.5 whitespace-nowrap text-xs text-slate-300">
        {student.course || '—'}
      </td>

      {/* Batch */}
      <td className="py-3 px-3.5 whitespace-nowrap">
        <span className="inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
          {student.batchId || student.batch || '—'}
        </span>
      </td>

      {/* Email */}
      <td className="py-3 px-3.5 whitespace-nowrap text-xs text-slate-300">
        <span className="font-mono text-[11px] text-slate-400">
          {student.email || '—'}
        </span>
      </td>

      {/* Phone */}
      <td className="py-3 px-3.5 whitespace-nowrap text-xs text-slate-400 font-mono">
        {student.phone || '—'}
      </td>

      {/* Status */}
      <td className="py-3 px-3.5 whitespace-nowrap">
        {getStatusBadge(student.status)}
      </td>

      {/* Action */}
      <td className="py-3 px-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onOpenProfile(student)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 hover:border-indigo-500 transition-all shadow-sm"
        >
          <span>View 360°</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
};
