import React, { useState } from 'react';
import {
  AlertTriangle,
  Lock,
  Trash2,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../common/Button';
import {
  resetAllDatabaseData,
  verifyResetPasscode,
  ADMIN_RESET_PASSCODE,
  DatabaseResetProgress,
} from '../../services/databaseResetService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface DatabaseResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete?: () => void;
}

export const DatabaseResetModal: React.FC<DatabaseResetModalProps> = ({
  isOpen,
  onClose,
  onResetComplete,
}) => {
  const { user, userProfile } = useAuth();
  const { success, error } = useNotification();

  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<DatabaseResetProgress | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [deletedSummary, setDeletedSummary] = useState<Record<string, number>>({});

  if (!isOpen) return null;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!passcode.trim()) {
      setErrorMessage('Please enter the administrator master passcode.');
      return;
    }

    if (!verifyResetPasscode(passcode)) {
      setErrorMessage('Access Denied: Invalid administrator passcode.');
      error('Passcode Error', 'The master passcode entered is incorrect.');
      return;
    }

    setIsProcessing(true);
    setProgress({
      step: 'Initializing database wipe...',
      currentStepIndex: 1,
      totalSteps: 12,
      deletedCounts: {},
    });

    try {
      const result = await resetAllDatabaseData({
        passcode: passcode.trim(),
        operatorEmail: user?.email || userProfile?.email || 'admin@codeneksa.com',
        operatorUid: user?.uid || userProfile?.uid || 'admin',
        onProgress: (p) => setProgress(p),
      });

      setDeletedSummary(result.deletedCounts);
      setIsCompleted(true);
      success('Database Reset Complete', 'All operational database records have been erased and counters reset.');
      onResetComplete?.();
    } catch (err: unknown) {
      console.error('Database reset failed:', err);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during database reset.';
      setErrorMessage(msg);
      error('Reset Failed', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModalClose = () => {
    if (isProcessing) return; // Prevent closing mid-wipe
    if (isCompleted) {
      // Reload window to refresh all page caches cleanly
      window.location.reload();
    }
    setPasscode('');
    setErrorMessage('');
    setProgress(null);
    setIsCompleted(false);
    onClose();
  };

  const totalDeletedCount = Object.values(deletedSummary).reduce<number>((acc, c) => acc + Number(c || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Warning Banner */}
        <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/30 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Reset OS Database</h3>
            <p className="text-xs text-red-700 dark:text-red-400/80">Restricted to Administrators & Master Passcode</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {!isCompleted ? (
            <>
              {/* Warning Notice Box */}
              <div className="p-4 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Irreversible Permanent Action</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Executing this operation will permanently delete all student master records, cohorts, certificates,
                  templates, colleges, courses, communications, and audit history across Firestore. Sequence counters will be reset to zero.
                </p>
                <p className="text-amber-700 dark:text-amber-400 font-medium pt-1">
                  Operator authentication alone is not sufficient. You must provide the authorized 10-digit master passcode.
                </p>
              </div>

              {isProcessing && progress ? (
                /* Live Progress State */
                <div className="space-y-3 py-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-800 dark:text-slate-300 font-medium flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      {progress.step}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      Step {progress.currentStepIndex} of {progress.totalSteps}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300 ease-out"
                      style={{
                        width: `${Math.round((progress.currentStepIndex / progress.totalSteps) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* Passcode Form */
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-red-500" />
                        Admin Master Passcode
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">10-Digit Master Passcode</span>
                    </label>

                    <div className="relative">
                      <input
                        type={showPasscode ? 'text' : 'password'}
                        value={passcode}
                        onChange={(e) => {
                          setPasscode(e.target.value);
                          setErrorMessage('');
                        }}
                        placeholder="Enter master passcode"
                        autoFocus
                        disabled={isProcessing}
                        className={`w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-50 dark:bg-slate-950 border ${
                          errorMessage ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                        } text-slate-900 dark:text-slate-100 font-mono tracking-wider text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500/30 focus:outline-none transition-colors`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasscode(!showPasscode)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {errorMessage && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {errorMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={handleModalClose}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      type="submit"
                      disabled={isProcessing || !passcode.trim()}
                      isLoading={isProcessing}
                      icon={<Trash2 className="w-4 h-4" />}
                    >
                      Erase & Reset OS Database
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* Reset Completed Summary Screen */
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Database Wiped & Reset</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  All target Firestore collections have been purged. System sequence counters are reset to zero.
                </p>
              </div>

              {/* Stats pill list */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-left max-h-48 overflow-y-auto space-y-1.5">
                <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-800/80">
                  <span>Purged Collection</span>
                  <span>Documents Deleted</span>
                </div>
                {Object.entries(deletedSummary).map(([col, cnt]: [string, number]) => (
                  <div key={col} className="flex justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    <span className="capitalize">{col}</span>
                    <span className={Number(cnt) > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-400'}>
                      {cnt}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 pt-1.5 border-t border-slate-200 dark:border-slate-800/80">
                  <span>Total Records Removed</span>
                  <span>{totalDeletedCount}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full justify-center"
                  onClick={handleModalClose}
                  icon={<RotateCcw className="w-4 h-4" />}
                >
                  Reload Application & Refresh State
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
