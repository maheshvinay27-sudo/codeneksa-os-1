import React, { useState } from 'react';
import {
  Send,
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Mail,
  FlaskConical,
} from 'lucide-react';
import { Student, EmailTemplate, EmailProviderConfig } from '../../types';
import { sendIndividualWelcomeEmail } from '../../services/emailService';

interface SendTestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: EmailTemplate;
  providerConfig: EmailProviderConfig;
  sampleStudent?: Student | null;
}

export const SendTestEmailModal: React.FC<SendTestEmailModalProps> = ({
  isOpen,
  onClose,
  template,
  providerConfig,
  sampleStudent,
}) => {
  const [testEmail, setTestEmail] = useState(providerConfig.testRecipient || 'operations-test@codeneksa.com');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    details?: string;
  } | null>(null);

  if (!isOpen) return null;

  // Fallback sample student if none provided
  const targetStudent: Student = sampleStudent || {
    id: 'sample-student-001',
    name: 'Ravi Kumar',
    hallTicket: 'HT001',
    college: 'Viveka Degree College',
    collegeId: 'COLLEGE-001',
    course: 'Bachelor of Computer Applications',
    courseId: 'COURSE-001',
    batch: 'BATCH-000001',
    batchId: 'BATCH-000001',
    email: 'ravi.kumar@example.com',
    phone: '+91 98765 43210',
    studentId: 'CKS-000008',
    tempStudentId: 'TMP-000001-0001',
    studentIdStatus: 'ASSIGNED',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const res = await sendIndividualWelcomeEmail({
        student: targetStudent,
        template,
        isTest: true,
        testRecipient: testEmail,
      });

      if (res.success) {
        setResult({
          success: true,
          message: `Test email successfully dispatched to ${testEmail}!`,
          details: `Provider Message ID: ${res.providerMessageId || 'msg_test'}`,
        });
      } else {
        setResult({
          success: false,
          message: `Test delivery rejected: ${res.error}`,
          details: res.errorCode ? `Error Code: ${res.errorCode}` : undefined,
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Unknown network failure',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="send-test-email-modal"
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">Send Test Email</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-500/30">
                  SAFE MODE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dispatches a fully rendered sample email without altering student database records
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
        <form onSubmit={handleSendTest} className="p-5 space-y-4 text-xs">
          {/* Safeguard Notice */}
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/60 text-indigo-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Zero Database Impact</span>
            </div>
            <p className="text-[11px] text-indigo-200/80 leading-relaxed">
              This will send a test email exclusively to the specified address below. The student status in Firestore remains completely unchanged.
            </p>
          </div>

          {/* Test Recipient Input */}
          <div>
            <label htmlFor="input-test-recipient" className="text-xs font-semibold text-slate-300 block mb-1">
              Destination Test Recipient Email
            </label>
            <input
              id="input-test-recipient"
              type="email"
              required
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="e.g. operator@codeneksa.com"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Sample Student Context */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Test Sample Persona Used in Rendering:
            </span>
            <div className="font-mono text-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{targetStudent.name}</span>
              <span className="text-indigo-400">{targetStudent.studentId}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {targetStudent.college} • {targetStudent.course} • {targetStudent.batchId}
            </p>
          </div>

          {/* Result Alert */}
          {result && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                result.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800 text-rose-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-xs">{result.message}</p>
                {result.details && (
                  <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                    {result.details}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              id="btn-submit-test-email"
              type="submit"
              disabled={sending || !testEmail}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Dispatching...' : 'Dispatch Test Email'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
