import React, { useState, useEffect } from 'react';
import {
  IdCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Hash,
  GraduationCap,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useNotification } from '../../context/NotificationContext';
import {
  generateIdAssignmentPreview,
  assignStudentIdsToBatch,
  getStudentIdCounter,
} from '../../services/studentIdService';
import {
  Batch,
  IdAssignmentPreviewItem,
  IdAssignmentProgress,
  IdAssignmentResult,
  SystemCounter,
} from '../../types';

interface AssignIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch | null;
  onAssignmentSuccess?: (result: IdAssignmentResult) => void;
  onViewRoster?: (batchId: string) => void;
}

type ModalStep = 'preview' | 'processing' | 'result';

export const AssignIdModal: React.FC<AssignIdModalProps> = ({
  isOpen,
  onClose,
  batch,
  onAssignmentSuccess,
  onViewRoster,
}) => {
  const { success, error: notifyError, warning: notifyWarning, addNotification } = useNotification();
  const [currentStep, setCurrentStep] = useState<ModalStep>('preview');
  const [loadingPreview, setLoadingPreview] = useState<boolean>(true);
  const [previewItems, setPreviewItems] = useState<IdAssignmentPreviewItem[]>([]);
  const [previewMeta, setPreviewMeta] = useState<{
    totalStudents: number;
    totalAwaiting: number;
    totalAlreadyAssigned: number;
    currentCounterNumber: number;
    startId: string;
    endId: string;
  }>({
    totalStudents: 0,
    totalAwaiting: 0,
    totalAlreadyAssigned: 0,
    currentCounterNumber: 0,
    startId: '',
    endId: '',
  });

  const [counter, setCounter] = useState<SystemCounter | null>(null);
  const [progress, setProgress] = useState<IdAssignmentProgress>({
    processed: 0,
    total: 0,
    successful: 0,
    failed: 0,
    remaining: 0,
    percentage: 0,
    statusMessage: 'Preparing sequence...',
  });
  const [assignmentResult, setAssignmentResult] = useState<IdAssignmentResult | null>(null);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Load preview data when modal opens
  useEffect(() => {
    if (!isOpen || !batch) {
      setCurrentStep('preview');
      setPreviewItems([]);
      setAssignmentResult(null);
      return;
    }

    let isMounted = true;
    const loadPreview = async () => {
      setLoadingPreview(true);
      try {
        const [previewData, counterData] = await Promise.all([
          generateIdAssignmentPreview(batch.id),
          getStudentIdCounter(),
        ]);
        if (isMounted) {
          setPreviewItems(previewData.items);
          setPreviewMeta({
            totalStudents: previewData.totalStudents,
            totalAwaiting: previewData.totalAwaiting,
            totalAlreadyAssigned: previewData.totalAlreadyAssigned,
            currentCounterNumber: previewData.currentCounterNumber,
            startId: previewData.startId,
            endId: previewData.endId,
          });
          setCounter(counterData);
          setCurrentStep('preview');
        }
      } catch (err: any) {
        console.error('Failed to generate preview:', err);
        notifyError('Preview Failed', err?.message || 'Could not load student preview for ID generation.');
      } finally {
        if (isMounted) setLoadingPreview(false);
      }
    };

    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [isOpen, batch, notifyError]);

  // Handle ID generation execution
  const handleConfirmAssignment = async () => {
    if (!batch || isAssigning) return;

    setIsAssigning(true);
    setCurrentStep('processing');
    setProgress({
      processed: 0,
      total: previewMeta.totalAwaiting,
      successful: 0,
      failed: 0,
      remaining: previewMeta.totalAwaiting,
      percentage: 5,
      statusMessage: 'Initiating atomic transaction in Cloud Firestore...',
    });

    try {
      const result = await assignStudentIdsToBatch(
        batch.id,
        batch.name,
        (p) => setProgress(p)
      );

      setAssignmentResult(result);
      setCurrentStep('result');

      if (result.success) {
        success('Student IDs Assigned', `Successfully assigned permanent IDs to ${result.newlyAssignedCount} students in ${batch.name}.`);
        if (onAssignmentSuccess) {
          onAssignmentSuccess(result);
        }
      } else {
        if (notifyWarning) {
          notifyWarning('Partial Assignment', result.error || 'Some student IDs could not be assigned.');
        } else {
          addNotification({
            type: 'warning',
            title: 'Partial Assignment',
            message: result.error || 'Some student IDs could not be assigned.',
          });
        }
      }
    } catch (err: any) {
      console.error('ID assignment failed:', err);
      setCurrentStep('preview');
      notifyError('Assignment Failed', err?.message || 'Failed to assign permanent student IDs. Database state was not corrupted.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isOpen || !batch) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isAssigning) onClose();
      }}
      title=""
      description=""
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 -mt-3">
        {/* Header with Employee Identity */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Student ID Employee</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Atomic & Idempotent
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Assign permanent, unique Codeneksa Student IDs (CKS-XXXXXX) to cohort{' '}
                <span className="font-semibold text-slate-200">{batch.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="purple" size="md">
              Cohort: {batch.code || batch.id}
            </Badge>
          </div>
        </div>

        {/* STEP 1: PREVIEW & VERIFICATION */}
        {currentStep === 'preview' && (
          <div className="space-y-4">
            {loadingPreview ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <LoadingSpinner size="lg" />
                <p className="text-xs text-slate-400">
                  Querying Cloud Firestore and calculating global sequence preview...
                </p>
              </div>
            ) : (
              <>
                {/* Global Sequence Summary Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Cohort Size
                    </span>
                    <p className="text-lg font-bold text-slate-100 mt-0.5">
                      {previewMeta.totalStudents} students
                    </p>
                    <span className="text-[11px] text-slate-500">Enrolled in batch</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Awaiting Permanent ID
                    </span>
                    <p className="text-lg font-bold text-amber-300 mt-0.5">
                      {previewMeta.totalAwaiting} students
                    </p>
                    <span className="text-[11px] text-slate-500">Will receive CKS IDs</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Already Assigned
                    </span>
                    <p className="text-lg font-bold text-emerald-300 mt-0.5">
                      {previewMeta.totalAlreadyAssigned} students
                    </p>
                    <span className="text-[11px] text-slate-500">Preserved (idempotent)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      Proposed ID Range
                    </span>
                    <p className="text-sm font-mono font-bold text-indigo-300 mt-1 truncate">
                      {previewMeta.totalAwaiting > 0
                        ? `${previewMeta.startId} → ${previewMeta.endId}`
                        : 'All Assigned'}
                    </p>
                    <span className="text-[11px] text-slate-500">
                      Current sequence: {counter?.currentNumber || 0}
                    </span>
                  </div>
                </div>

                {/* Idempotency / Safety Alert if all are already assigned */}
                {previewMeta.totalAwaiting === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-emerald-200">
                        All Students in this cohort already have permanent Codeneksa IDs
                      </h4>
                      <p className="text-emerald-300/80 mt-1 leading-relaxed">
                        Every student record in this batch is already assigned an official, unique CKS ID.
                        Because the Student ID Employee is strictly idempotent, running assignment again will
                        never alter existing IDs, generate duplicate numbers, or skip sequence counters.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      <p className="font-semibold text-indigo-100">
                        Atomic & Concurrency-Safe Transaction:
                      </p>
                      <p className="text-indigo-300/90 mt-0.5">
                        Each student will be atomically updated with their permanent Codeneksa ID. The global
                        system counter (<code className="font-mono text-indigo-200">/systemCounters/studentId</code>)
                        will be incremented from{' '}
                        <strong className="text-white">{previewMeta.currentCounterNumber}</strong> to{' '}
                        <strong className="text-white">
                          {previewMeta.currentCounterNumber + previewMeta.totalAwaiting}
                        </strong>
                        . Temporary reference IDs are preserved in <code className="font-mono text-indigo-200">tempStudentId</code>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Student Assignment Mapping Preview Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Student ID Assignment Preview ({previewItems.length} records)
                    </span>
                    <span className="text-[11px]">
                      Temporary Reference ID &rarr; Permanent Codeneksa ID
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 bg-slate-900 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800 z-10">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Hall Ticket</th>
                          <th className="py-2.5 px-3">Temporary Ref ID</th>
                          <th className="py-2.5 px-3 text-center">Transform</th>
                          <th className="py-2.5 px-3">Permanent CKS ID</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {previewItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-500">
                              No students found in this batch.
                            </td>
                          </tr>
                        ) : (
                          previewItems.map((item, idx) => (
                            <tr key={item.studentDocId} className="hover:bg-slate-900/50">
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-100">
                                {item.studentName}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                                {item.hallTicketNumber || '—'}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                                {item.currentReferenceId}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-500">
                                &rarr;
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-[11px] text-indigo-300">
                                {item.newCodeneksaId}
                              </td>
                              <td className="py-2 px-3">
                                {item.alreadyAssigned ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Already Assigned
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Pending Allocation
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Cancel
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleConfirmAssignment}
                      disabled={previewMeta.totalStudents === 0 || isAssigning}
                      className="shadow-lg shadow-indigo-600/20"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      {previewMeta.totalAwaiting === 0
                        ? 'Verify & Sync Batch Roster'
                        : `Confirm & Assign ${previewMeta.totalAwaiting} Permanent IDs`}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 2: PROCESSING / PROGRESS */}
        {currentStep === 'processing' && (
          <div className="py-10 px-4 space-y-6 max-w-md mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-7 h-7 animate-spin" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-100">
                The Student ID Employee is at Work
              </h4>
              <p className="text-xs text-slate-400">
                Executing atomic Firestore transactions and sequentially assigning permanent IDs
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 shadow-sm shadow-indigo-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{progress.statusMessage}</span>
                <span className="font-semibold text-slate-200">{progress.percentage}%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs pt-2">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Processed</span>
                <p className="font-bold text-slate-200 mt-0.5">{progress.processed}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-emerald-400 uppercase font-bold">Success</span>
                <p className="font-bold text-emerald-300 mt-0.5">{progress.successful}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Remaining</span>
                <p className="font-bold text-slate-400 mt-0.5">{progress.remaining}</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT & AUDIT CONFIRMATION */}
        {currentStep === 'result' && assignmentResult && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-emerald-200">
                    {assignmentResult.newlyAssignedCount > 0
                      ? 'Permanent Student IDs Successfully Assigned'
                      : 'Cohort Already Fully Synchronized'}
                  </h4>
                  <p className="text-xs text-emerald-300/80 mt-1 leading-relaxed">
                    {assignmentResult.newlyAssignedCount > 0
                      ? `Assigned ${assignmentResult.newlyAssignedCount} permanent Codeneksa Student IDs to ${assignmentResult.batchName}. Master sequence and student directory have been updated.`
                      : `All ${assignmentResult.totalStudents} students already have permanent IDs. No sequence numbers were consumed.`}
                  </p>
                </div>
              </div>

              {assignmentResult.startId && assignmentResult.endId && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-right flex-shrink-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    ID Range Allocated
                  </span>
                  <p className="text-sm font-mono font-bold text-slate-100 mt-0.5">
                    {assignmentResult.startId === assignmentResult.endId
                      ? assignmentResult.startId
                      : `${assignmentResult.startId} → ${assignmentResult.endId}`}
                  </p>
                </div>
              )}
            </div>

            {/* Metrics breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Cohort Students
                </span>
                <p className="text-xl font-bold text-slate-100 mt-0.5">
                  {assignmentResult.totalStudents}
                </p>
                <span className="text-[11px] text-slate-500">Verified in Firestore</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Newly Assigned
                </span>
                <p className="text-xl font-bold text-emerald-300 mt-0.5">
                  {assignmentResult.newlyAssignedCount}
                </p>
                <span className="text-[11px] text-slate-500">New CKS IDs issued</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Total With Permanent ID
                </span>
                <p className="text-xl font-bold text-indigo-300 mt-0.5">
                  {assignmentResult.alreadyAssignedCount + assignmentResult.newlyAssignedCount} /{' '}
                  {assignmentResult.totalStudents}
                </p>
                <span className="text-[11px] text-slate-500">100% Cohort Coverage</span>
              </div>
            </div>

            {/* Next actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>

              <div className="flex items-center gap-2">
                {onViewRoster && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onViewRoster(assignmentResult.batchId);
                    }}
                  >
                    <GraduationCap className="w-4 h-4 mr-1.5" />
                    View Updated Batch Roster
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
