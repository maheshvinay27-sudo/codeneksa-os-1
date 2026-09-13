import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  Eye,
  Mail,
  Building2,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Student, EmailTemplate } from '../../types';
import { renderTemplate } from '../../services/emailTemplateService';

interface WelcomeMailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: EmailTemplate;
  students: Student[];
  initialIndex?: number;
  onConfirmSendBatch?: (selectedStudents: Student[]) => void;
  onConfirmSendSingle?: (student: Student) => void;
  isBulkMode?: boolean;
}

export const WelcomeMailPreviewModal: React.FC<WelcomeMailPreviewModalProps> = ({
  isOpen,
  onClose,
  template,
  students,
  initialIndex = 0,
  onConfirmSendBatch,
  onConfirmSendSingle,
  isBulkMode = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || students.length === 0) return null;

  const currentStudent = students[currentIndex] || students[0];
  const rendered = renderTemplate(template, currentStudent);
  const hasValidEmail = Boolean(currentStudent.email && currentStudent.email.trim().includes('@'));
  const isPermanent =
    currentStudent.studentIdStatus === 'ASSIGNED' ||
    (currentStudent.studentId && currentStudent.studentId.startsWith('CKS-'));

  const validCount = students.filter((s) => s.email && s.email.trim().includes('@')).length;
  const invalidCount = students.length - validCount;
  const alreadySentCount = students.filter((s) => s.welcomeEmailStatus === 'SENT').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="welcome-mail-preview-modal"
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {isBulkMode ? `Bulk Preview (${students.length} Recipients)` : 'Email Preview & Verification'}
              </h3>
              <p className="text-xs text-slate-400">
                Verifying rendered personalized fields prior to dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('html')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'html'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Styled HTML
              </button>
              <button
                type="button"
                onClick={() => setViewMode('text')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'text'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Plain Text
              </button>
            </div>

            <button
              id="btn-close-preview-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk Student Carousel Bar (if multi) */}
        {isBulkMode && students.length > 1 && (
          <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                id="btn-preview-prev-student"
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono font-semibold text-slate-300">
                Student {currentIndex + 1} of {students.length}
              </span>
              <button
                id="btn-preview-next-student"
                type="button"
                disabled={currentIndex === students.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(students.length - 1, prev + 1))}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-emerald-400 font-medium">Valid: {validCount}</span>
              {invalidCount > 0 && (
                <span className="text-rose-400 font-medium">Missing Email: {invalidCount}</span>
              )}
              {alreadySentCount > 0 && (
                <span className="text-amber-400 font-medium">Already Sent: {alreadySentCount}</span>
              )}
            </div>
          </div>
        )}

        {/* Recipient & Envelope Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold w-16">To:</span>
              <span className="font-semibold text-slate-100">{currentStudent.name}</span>
              {hasValidEmail ? (
                <span className="font-mono text-indigo-300">&lt;{currentStudent.email}&gt;</span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold text-[10px] border border-rose-800">
                  NO VALID EMAIL
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <span
                className={`font-mono text-[11px] font-bold ${
                  isPermanent ? 'text-indigo-400' : 'text-slate-400'
                }`}
              >
                {currentStudent.studentId || currentStudent.tempStudentId || '—'}
              </span>
              {isPermanent && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold w-16">Subject:</span>
            <span className="font-semibold text-slate-200">{rendered.subject}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-semibold w-16">From:</span>
            <span>
              {template.senderName} &lt;{template.senderEmail || 'admissions@codeneksa.com'}&gt; (Reply-To: {template.replyTo})
            </span>
          </div>
        </div>

        {/* Rendered Preview Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/70 scrollbar-thin">
          {viewMode === 'html' ? (
            <div className="max-w-2xl mx-auto rounded-xl overflow-hidden shadow-lg border border-slate-800">
              <iframe
                title="Email Preview"
                srcDoc={rendered.html}
                className="w-full h-[450px] bg-white border-0"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto p-6 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {rendered.body}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {currentStudent.welcomeEmailStatus === 'SENT' ? (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                This student already received a welcome email.
              </span>
            ) : (
              <span>Ready for dispatch verification.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            {isBulkMode && onConfirmSendBatch ? (
              <button
                id="btn-confirm-bulk-send"
                type="button"
                onClick={() => onConfirmSendBatch(students)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Dispatch {students.length} Welcome Emails</span>
              </button>
            ) : onConfirmSendSingle ? (
              <button
                id="btn-confirm-single-send"
                type="button"
                disabled={!hasValidEmail}
                onClick={() => onConfirmSendSingle(currentStudent)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Welcome Email</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
