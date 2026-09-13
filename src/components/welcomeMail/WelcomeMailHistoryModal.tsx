import React, { useState, useEffect } from 'react';
import {
  History,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Mail,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Student, EmailLog, EmailTemplate } from '../../types';
import { fetchStudentEmailLogs, retryWelcomeEmail } from '../../services/emailService';

interface WelcomeMailHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  template: EmailTemplate;
  onRetrySuccess?: () => void;
}

export const WelcomeMailHistoryModal: React.FC<WelcomeMailHistoryModalProps> = ({
  isOpen,
  onClose,
  student,
  template,
  onRetrySuccess,
}) => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && student) {
      loadLogs();
    }
  }, [isOpen, student]);

  const loadLogs = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const history = await fetchStudentEmailLogs(student.studentId || student.id);
      setLogs(history);
    } catch (err) {
      console.error('Error loading email logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!student) return;
    setRetrying(true);
    setRetryResult(null);
    try {
      const res = await retryWelcomeEmail(student, template);
      if (res.success) {
        setRetryResult('Welcome email successfully re-dispatched!');
        await loadLogs();
        onRetrySuccess?.();
      } else {
        setRetryResult(`Retry failed: ${res.error}`);
      }
    } catch (err) {
      setRetryResult(err instanceof Error ? err.message : 'Unknown retry failure');
    } finally {
      setRetrying(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="welcome-mail-history-modal"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Email Dispatch Audit History
              </h3>
              <p className="text-xs text-slate-400">
                {student.name} • <span className="font-mono text-indigo-400">{student.studentId || student.tempStudentId}</span>
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

        {/* Retry Banner if Failed */}
        {student.welcomeEmailStatus === 'FAILED' && (
          <div className="p-3 bg-rose-950/40 border-b border-rose-900/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>The last email attempt failed. You can re-dispatch this student.</span>
            </div>
            <button
              type="button"
              disabled={retrying}
              onClick={handleRetry}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-rose-950 shrink-0"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Retrying...' : 'Retry Dispatch'}</span>
            </button>
          </div>
        )}

        {retryResult && (
          <div
            className={`p-3 text-xs border-b ${
              retryResult.includes('success')
                ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
            }`}
          >
            {retryResult}
          </div>
        )}

        {/* List of Email Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading communication audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No historical email dispatch logs recorded for this student yet.
            </div>
          ) : (
            logs.map((log) => {
              const isSent = log.status === 'SENT' || log.status === 'sent';
              const isFailed = log.status === 'FAILED' || log.status === 'failed';

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            isSent
                              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                              : isFailed
                              ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                              : 'bg-amber-950/80 border border-amber-800 text-amber-300'
                          }`}
                        >
                          {isSent ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : isFailed ? (
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-400" />
                          )}
                          {log.status}
                        </span>
                        <span className="font-semibold text-slate-200">{log.subject}</span>
                        {log.isTest && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-mono text-[9px] border border-amber-800">
                            TEST
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1 font-mono">
                        Recipient: {log.recipientEmail}
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Metadata line */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500">Provider Msg ID:</span>{' '}
                      <span className="font-mono text-slate-300">
                        {log.providerMessageId || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Retry Count:</span>{' '}
                      <span className="font-mono text-slate-300">{log.retryCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Operator:</span>{' '}
                      <span className="truncate block text-slate-300">
                        {log.createdBy || log.triggeredBy || 'System'}
                      </span>
                    </div>
                  </div>

                  {/* Failure details if present */}
                  {isFailed && (log.errorMessage || log.errorCode) && (
                    <div className="p-2 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300 text-[11px] font-mono">
                      Error: {log.errorCode ? `[${log.errorCode}] ` : ''}
                      {log.errorMessage}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
