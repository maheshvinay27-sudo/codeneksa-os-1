import React, { useState } from 'react';
import { Copy, Check, Fingerprint, Hash, User, Tag } from 'lucide-react';
import { Student } from '../../types';

interface StudentIdentityCardProps {
  student: Student;
}

export const StudentIdentityCard: React.FC<StudentIdentityCardProps> = ({ student }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isPermanent =
    student.studentIdStatus === 'ASSIGNED' ||
    (student.studentId && student.studentId.startsWith('CKS-'));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
        <Fingerprint className="w-4 h-4 text-indigo-400" />
        <span>Section 1 — Master Identity</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Permanent Student ID */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
            <span>Codeneksa Student ID</span>
            {isPermanent && (
              <span className="text-[10px] text-emerald-400 font-semibold">Verified</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-bold text-indigo-300">
              {isPermanent ? student.studentId : 'Pending Assignment'}
            </span>
            {isPermanent && (
              <button
                type="button"
                onClick={() => handleCopy(student.studentId, 'studentId')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Copy Student ID"
              >
                {copiedField === 'studentId' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Temporary Reference ID */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
            <span>Temporary Reference ID</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-slate-300">
              {student.tempStudentId || student.studentId || '—'}
            </span>
            {(student.tempStudentId || student.studentId) && (
              <button
                type="button"
                onClick={() =>
                  handleCopy(student.tempStudentId || student.studentId, 'tempId')
                }
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Copy Reference ID"
              >
                {copiedField === 'tempId' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Student Full Name */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1">
            Student Full Name
          </div>
          <div className="text-xs font-semibold text-slate-200">
            {student.name || '—'}
          </div>
        </div>

        {/* Hall Ticket Number */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
            <span>Hall Ticket Number</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold text-slate-200">
              {student.hallTicketNumber || '—'}
            </span>
            {student.hallTicketNumber && (
              <button
                type="button"
                onClick={() => handleCopy(student.hallTicketNumber, 'hallTicket')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Copy Hall Ticket"
              >
                {copiedField === 'hallTicket' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
