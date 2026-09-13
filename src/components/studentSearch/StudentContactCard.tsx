import React, { useState } from 'react';
import { Mail, Phone, Copy, Check, ShieldAlert, Lock } from 'lucide-react';
import { Student } from '../../types';

interface StudentContactCardProps {
  student: Student;
}

export const StudentContactCard: React.FC<StudentContactCardProps> = ({ student }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Mail className="w-4 h-4 text-indigo-400" />
          <span>Section 2 — Verified Contact Details</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Email */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            <span>Official Email Address</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-slate-200 truncate" title={student.email}>
              {student.email || '—'}
            </span>
            {student.email && (
              <button
                type="button"
                onClick={() => handleCopy(student.email, 'email')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title="Copy Email"
              >
                {copiedField === 'email' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-indigo-400" />
            <span>Primary Phone Number</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-slate-200">
              {student.phone || '—'}
            </span>
            {student.phone && (
              <button
                type="button"
                onClick={() => handleCopy(student.phone, 'phone')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title="Copy Phone"
              >
                {copiedField === 'phone' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-300/90 text-xs">
        <Lock className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-slate-200">Confidential Student Contact Data:</span>{' '}
          Protected under internal compliance rules. Authorized operator access only.
        </div>
      </div>
    </div>
  );
};
