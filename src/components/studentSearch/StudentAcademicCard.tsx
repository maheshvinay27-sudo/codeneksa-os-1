import React from 'react';
import { Building2, BookOpen, FolderKanban, Calendar, ExternalLink } from 'lucide-react';
import { Student } from '../../types';

interface StudentAcademicCardProps {
  student: Student;
  onViewBatch?: (batchId: string) => void;
  onViewCollege?: (collegeId: string) => void;
}

export const StudentAcademicCard: React.FC<StudentAcademicCardProps> = ({
  student,
  onViewBatch,
  onViewCollege,
}) => {
  const enrollmentDateStr = student.createdAt
    ? new Date(student.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
        <BookOpen className="w-4 h-4 text-indigo-400" />
        <span>Section 3 — Academic Association</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* College */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Assigned College</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">
              {student.college || '—'}
            </div>
          </div>
          {student.collegeId && onViewCollege && (
            <button
              type="button"
              onClick={() => onViewCollege(student.collegeId)}
              className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 self-start transition-colors"
            >
              <span>View College Records</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Course */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Academic Course</span>
          </div>
          <div className="text-xs font-semibold text-slate-200">
            {student.course || '—'}
          </div>
        </div>

        {/* Batch */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
              <span>Roster Batch</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">
              {student.batch || '—'}
            </div>
            <div className="text-[11px] font-mono text-indigo-300 mt-0.5">
              ID: {student.batchId || '—'}
            </div>
          </div>
          {student.batchId && onViewBatch && (
            <button
              type="button"
              onClick={() => onViewBatch(student.batchId)}
              className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 self-start transition-colors"
            >
              <span>Open Batch Details</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Enrollment Date */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Enrollment Date</span>
          </div>
          <div className="text-xs font-semibold text-slate-200">
            {enrollmentDateStr}
          </div>
        </div>
      </div>
    </div>
  );
};
