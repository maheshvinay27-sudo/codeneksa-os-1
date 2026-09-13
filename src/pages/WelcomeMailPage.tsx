import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  RotateCcw,
  Eye,
  FileText,
  History,
  Layers,
  Sparkles,
  RefreshCw,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Filter,
} from 'lucide-react';
import {
  Student,
  Batch,
  EmailTemplate,
  EmailLog,
  EmailProviderConfig,
  WelcomeMailKPIs as KPIsType,
  WelcomeMailBatchStats,
} from '../types';
import {
  checkEmailProviderConfig,
  fetchWelcomeMailKPIs,
  fetchBatchesWithEmailStats,
  fetchAllEmailLogs,
  sendIndividualWelcomeEmail,
  executeBatchWelcomeEmails,
} from '../services/emailService';
import {
  getDefaultWelcomeTemplate,
  saveEmailTemplate,
} from '../services/emailTemplateService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

import { WelcomeMailKPIs } from '../components/welcomeMail/WelcomeMailKPIs';
import { EmailProviderStatusBanner } from '../components/welcomeMail/EmailProviderStatusBanner';
import { WelcomeMailBatchSelector } from '../components/welcomeMail/WelcomeMailBatchSelector';
import { WelcomeMailFilters } from '../components/welcomeMail/WelcomeMailFilters';
import { WelcomeMailStudentTable } from '../components/welcomeMail/WelcomeMailStudentTable';
import { WelcomeMailTemplateEditor } from '../components/welcomeMail/WelcomeMailTemplateEditor';
import { CustomMessageCard } from '../components/welcomeMail/CustomMessageCard';
import { WelcomeMailPreviewModal } from '../components/welcomeMail/WelcomeMailPreviewModal';
import { WelcomeMailConfirmDialog } from '../components/welcomeMail/WelcomeMailConfirmDialog';
import {
  WelcomeMailProgressModal,
  BatchProgressState,
} from '../components/welcomeMail/WelcomeMailProgressModal';
import { WelcomeMailHistoryModal } from '../components/welcomeMail/WelcomeMailHistoryModal';
import { SendTestEmailModal } from '../components/welcomeMail/SendTestEmailModal';

interface WelcomeMailPageProps {
  onNavigateToStudent?: (studentId: string) => void;
}

export const WelcomeMailPage: React.FC<WelcomeMailPageProps> = ({
  onNavigateToStudent,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dispatch' | 'batches' | 'template' | 'logs'>('dispatch');

  // Core Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchStats, setBatchStats] = useState<Record<string, WelcomeMailBatchStats>>({});
  const [kpis, setKpis] = useState<KPIsType>({
    totalStudents: 0,
    sentCount: 0,
    pendingCount: 0,
    failedCount: 0,
    notSentCount: 0,
  });
  const [providerConfig, setProviderConfig] = useState<EmailProviderConfig>({
    configured: false,
    provider: 'unconfigured',
    fromAddress: 'admissions@codeneksa.com',
    fromName: 'Codeneksa Admissions',
    replyTo: 'support@codeneksa.com',
    testRecipient: 'operations-test@codeneksa.com',
  });
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [globalLogs, setGlobalLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  // Table Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [sendingStudentId, setSendingStudentId] = useState<string | null>(null);

  // Modals
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewStudents, setPreviewStudents] = useState<Student[]>([]);
  const [previewBulkMode, setPreviewBulkMode] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmStudents, setConfirmStudents] = useState<Student[]>([]);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressState, setProgressState] = useState<BatchProgressState>({
    completed: 0,
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    isComplete: false,
    results: [],
  });
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);

  // Toast / Alert Notification
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Provider config
      const config = await checkEmailProviderConfig();
      setProviderConfig(config);

      // 2. Default template
      const tmpl = await getDefaultWelcomeTemplate();
      setTemplate(tmpl);

      // 3. KPIs
      const kpiData = await fetchWelcomeMailKPIs();
      setKpis(kpiData);

      // 4. Batches & stats
      const { batches: bList, stats: bStats } = await fetchBatchesWithEmailStats();
      setBatches(bList);
      setBatchStats(bStats);

      // 5. Students
      const studentsSnap = await getDocs(collection(db, 'students'));
      const studentList: Student[] = [];
      studentsSnap.forEach((d) => studentList.push({ id: d.id, ...(d.data() as Student) }));
      setStudents(studentList);

      // 6. Global Logs
      const logs = await fetchAllEmailLogs(50);
      setGlobalLogs(logs);
    } catch (err) {
      console.error('Error loading Welcome Mail Employee data:', err);
      showToast('Error loading data from Firestore', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute available filter lists
  const availableColleges = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.college) set.add(s.college);
    });
    return Array.from(set).sort();
  }, [students]);

  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.course) set.add(s.course);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Batch filter
      if (selectedBatchId && (student.batchId || student.batch) !== selectedBatchId) {
        return false;
      }

      // College filter
      if (collegeFilter && student.college !== collegeFilter) {
        return false;
      }

      // Course filter
      if (courseFilter && student.course !== courseFilter) {
        return false;
      }

      // Status filter
      const emailStatus = student.welcomeEmailStatus || 'NOT_SENT';
      const hasEmail = Boolean(student.email && student.email.trim().includes('@'));

      if (statusFilter === 'MISSING_EMAIL') {
        if (hasEmail) return false;
      } else if (statusFilter !== 'ALL') {
        if (statusFilter === 'NOT_SENT') {
          if (emailStatus !== 'NOT_SENT' || !hasEmail) return false;
        } else if (emailStatus !== statusFilter) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = (student.name || '').toLowerCase().includes(query);
        const matchId = (student.studentId || '').toLowerCase().includes(query);
        const matchTempId = (student.tempStudentId || '').toLowerCase().includes(query);
        const matchEmail = (student.email || '').toLowerCase().includes(query);
        const matchHT = (student.hallTicket || '').toLowerCase().includes(query);
        if (!matchName && !matchId && !matchTempId && !matchEmail && !matchHT) {
          return false;
        }
      }

      return true;
    });
  }, [
    students,
    selectedBatchId,
    collegeFilter,
    courseFilter,
    statusFilter,
    searchQuery,
  ]);

  // Selection handlers
  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const ids = filteredStudents.map((s) => s.id);
    setSelectedStudentIds(ids);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  // Preview Actions
  const handleOpenSinglePreview = (student: Student) => {
    setPreviewStudents([student]);
    setPreviewBulkMode(false);
    setPreviewModalOpen(true);
  };

  const handleOpenBulkPreview = () => {
    const selected = students.filter((s) => selectedStudentIds.includes(s.id));
    if (selected.length === 0) {
      showToast('Please select at least one student to preview.', 'info');
      return;
    }
    setPreviewStudents(selected);
    setPreviewBulkMode(true);
    setPreviewModalOpen(true);
  };

  // Single Dispatch
  const handleSendSingle = async (student: Student) => {
    if (!template) return;
    setSendingStudentId(student.id);

    try {
      const res = await sendIndividualWelcomeEmail({
        student,
        template,
        isTest: false,
        forceResend: student.welcomeEmailStatus === 'SENT',
      });

      if (res.success) {
        showToast(`Welcome email sent to ${student.name}!`, 'success');
      } else {
        showToast(`Dispatch failed: ${res.error}`, 'error');
      }
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send email', 'error');
    } finally {
      setSendingStudentId(null);
      setPreviewModalOpen(false);
    }
  };

  // Trigger Bulk Send Dialog
  const handleTriggerBulkSend = () => {
    const selected = students.filter((s) => selectedStudentIds.includes(s.id));
    if (selected.length === 0) {
      showToast('Please select at least one student to dispatch emails to.', 'info');
      return;
    }
    setConfirmStudents(selected);
    setConfirmDialogOpen(true);
    setPreviewModalOpen(false);
  };

  // Trigger Batch Dispatch
  const handleDispatchEntireBatch = (batchId: string) => {
    const batchStudents = students.filter(
      (s) => (s.batchId || s.batch) === batchId
    );
    if (batchStudents.length === 0) {
      showToast('No students found in this batch.', 'info');
      return;
    }
    setConfirmStudents(batchStudents);
    setConfirmDialogOpen(true);
  };

  // Execute Bulk Dispatch
  const handleConfirmExecuteBatch = async (skipAlreadySent: boolean) => {
    if (!template) return;
    setConfirmDialogOpen(false);

    setProgressState({
      completed: 0,
      total: confirmStudents.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      isComplete: false,
      results: [],
    });
    setProgressModalOpen(true);

    try {
      const outcome = await executeBatchWelcomeEmails({
        students: confirmStudents,
        template,
        skipAlreadySent,
        onProgress: (p) => {
          setProgressState((prev) => ({
            ...prev,
            completed: p.completed,
            total: p.total,
            sent: p.sent,
            failed: p.failed,
            skipped: p.skipped,
            currentStudentName: p.currentStudentName,
          }));
        },
      });

      setProgressState((prev) => ({
        ...prev,
        isComplete: true,
        results: outcome.results,
      }));

      await loadData();
    } catch (err) {
      console.error('Batch send error:', err);
      showToast('An unexpected error interrupted the batch run.', 'error');
      setProgressState((prev) => ({ ...prev, isComplete: true }));
    }
  };

  // History Modal
  const handleOpenHistory = (student: Student) => {
    setHistoryStudent(student);
    setHistoryModalOpen(true);
  };

  // Custom Message & Template Save
  const handleSaveTemplate = async (newTmpl: EmailTemplate) => {
    try {
      await saveEmailTemplate(newTmpl);
      setTemplate(newTmpl);
      showToast('Custom mail message saved successfully! All batch emails will use this message.', 'success');
    } catch (err: any) {
      console.error('Error saving mail message:', err);
      // Still update local state so user's current session uses it
      setTemplate(newTmpl);
      showToast('Custom mail message updated in session!', 'success');
    }
  };

  return (
    <div id="welcome-mail-employee-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl flex items-center gap-2 animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-700 text-rose-200'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          ) : (
            <Mail className="w-4 h-4 text-indigo-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">
                Welcome Mail Employee
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                Phase 5 • Employee #5
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated welcome email dispatch, delivery tracking, idempotency safeguards & audit logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Send Test Email Button */}
          <button
            id="btn-open-test-modal"
            type="button"
            onClick={() => setTestModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all border border-slate-700"
          >
            <FlaskConical className="w-3.5 h-3.5 text-indigo-400" />
            <span>Send Test Email</span>
          </button>

          {/* Refresh Button */}
          <button
            id="btn-refresh-mail-data"
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Provider Status Alert */}
      <EmailProviderStatusBanner
        config={providerConfig}
        onOpenTestModal={() => setTestModalOpen(true)}
      />

      {/* Top KPIs */}
      <WelcomeMailKPIs kpis={kpis} loading={loading} />

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-2 text-xs">
        <button
          id="tab-btn-dispatch"
          type="button"
          onClick={() => setActiveTab('dispatch')}
          className={`px-4 py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'dispatch'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Dispatch Operations</span>
        </button>

        <button
          id="tab-btn-batches"
          type="button"
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'batches'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Batch Cohorts ({batches.length})</span>
        </button>

        <button
          id="tab-btn-template"
          type="button"
          onClick={() => setActiveTab('template')}
          className={`px-4 py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'template'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Custom Message & Template</span>
        </button>

        <button
          id="tab-btn-logs"
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Global Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: Dispatch Operations */}
      {activeTab === 'dispatch' && (
        <div className="space-y-5">
          {/* Custom Message Card for Batch Dispatches */}
          {template && (
            <CustomMessageCard
              template={template}
              onSaveTemplate={handleSaveTemplate}
              onOpenPreview={() => {
                if (filteredStudents.length > 0) {
                  setPreviewStudents([filteredStudents[0]]);
                } else if (students.length > 0) {
                  setPreviewStudents([students[0]]);
                }
                setPreviewBulkMode(false);
                setPreviewModalOpen(true);
              }}
              sampleStudent={filteredStudents[0] || students[0]}
              activeBatchId={selectedBatchId}
            />
          )}

          {/* Batch Selector Card */}
          <WelcomeMailBatchSelector
            batches={batches}
            selectedBatchId={selectedBatchId}
            stats={batchStats}
            onSelectBatch={(id) => setSelectedBatchId(id)}
            onDispatchBatch={handleDispatchEntireBatch}
          />

          {/* Filters */}
          <WelcomeMailFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            collegeFilter={collegeFilter}
            onCollegeChange={setCollegeFilter}
            courseFilter={courseFilter}
            onCourseChange={setCourseFilter}
            colleges={availableColleges}
            courses={availableCourses}
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setCollegeFilter('');
              setCourseFilter('');
              setSelectedBatchId('');
            }}
            totalFiltered={filteredStudents.length}
          />

          {/* Bulk Action Banner when items selected */}
          {selectedStudentIds.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-200">
                  {selectedStudentIds.length} students selected for action
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-bulk-preview-selected"
                  type="button"
                  onClick={handleOpenBulkPreview}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Preview Selected</span>
                </button>
                <button
                  id="btn-bulk-send-selected"
                  type="button"
                  onClick={handleTriggerBulkSend}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Emails ({selectedStudentIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Student Table */}
          <WelcomeMailStudentTable
            students={filteredStudents}
            selectedStudentIds={selectedStudentIds}
            onToggleStudent={handleToggleStudent}
            onSelectAll={handleSelectAllVisible}
            onClearSelection={handleClearSelection}
            onPreviewStudent={handleOpenSinglePreview}
            onSendStudent={handleSendSingle}
            onRetryStudent={(s) => handleSendSingle(s)}
            onViewHistory={handleOpenHistory}
            sendingStudentId={sendingStudentId}
          />
        </div>
      )}

      {/* TAB 2: Batch Cohorts */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((b) => {
              const bId = b.batchId || b.id;
              const s = batchStats[bId];
              return (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-black text-indigo-400">
                        {bId}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100 mt-0.5">{b.name || bId}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{b.college || '—'}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px] font-bold">
                      {s ? s.totalStudents : 0} students
                    </span>
                  </div>

                  {s && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-800">
                      <div className="p-2 rounded-lg bg-slate-950">
                        <span className="text-[10px] text-emerald-400 block font-semibold">Sent</span>
                        <span className="font-mono font-bold text-emerald-400">{s.alreadySentCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950">
                        <span className="text-[10px] text-amber-400 block font-semibold">Pending</span>
                        <span className="font-mono font-bold text-amber-400">
                          {s.totalStudents - s.alreadySentCount - s.failedCount}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950">
                        <span className="text-[10px] text-rose-400 block font-semibold">Failed</span>
                        <span className="font-mono font-bold text-rose-400">{s.failedCount}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBatchId(bId);
                        setActiveTab('dispatch');
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      Inspect Students
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDispatchEntireBatch(bId)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-950"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Template Editor */}
      {activeTab === 'template' && template && (
        <WelcomeMailTemplateEditor
          template={template}
          onSaveTemplate={handleSaveTemplate}
          onOpenPreviewModal={() => {
            if (students.length > 0) {
              setPreviewStudents([students[0]]);
            }
            setPreviewBulkMode(false);
            setPreviewModalOpen(true);
          }}
          sampleStudent={students[0]}
        />
      )}

      {/* TAB 4: Global Logs */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">Platform Email Communication Audit</h3>
            <span className="text-xs text-slate-500 font-mono">Last 50 recorded events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="p-3">Time</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Provider Msg ID</th>
                  <th className="p-3">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {globalLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                      No communications recorded yet.
                    </td>
                  </tr>
                ) : (
                  globalLogs.map((log) => {
                    const isSent = log.status === 'SENT' || log.status === 'sent';
                    const isFailed = log.status === 'FAILED' || log.status === 'failed';
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-slate-400">
                          {new Date(log.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 text-slate-200 font-semibold">{log.recipientEmail}</td>
                        <td className="p-3 text-slate-300 font-sans truncate max-w-xs">{log.subject}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isSent
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : isFailed
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 truncate max-w-[120px]">
                          {log.providerMessageId || '—'}
                        </td>
                        <td className="p-3 text-slate-500 truncate max-w-[140px]">
                          {log.createdBy || log.triggeredBy || 'System'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {template && (
        <WelcomeMailPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          template={template}
          students={previewStudents}
          isBulkMode={previewBulkMode}
          onConfirmSendBatch={() => {
            setConfirmStudents(previewStudents);
            setConfirmDialogOpen(true);
            setPreviewModalOpen(false);
          }}
          onConfirmSendSingle={handleSendSingle}
        />
      )}

      <WelcomeMailConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        students={confirmStudents}
        onConfirm={handleConfirmExecuteBatch}
        batchId={selectedBatchId}
        template={template}
      />

      <WelcomeMailProgressModal
        isOpen={progressModalOpen}
        onClose={() => setProgressModalOpen(false)}
        progress={progressState}
      />

      {template && (
        <WelcomeMailHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          student={historyStudent}
          template={template}
          onRetrySuccess={loadData}
        />
      )}

      {template && (
        <SendTestEmailModal
          isOpen={testModalOpen}
          onClose={() => setTestModalOpen(false)}
          template={template}
          providerConfig={providerConfig}
          sampleStudent={students[0]}
        />
      )}
    </div>
  );
};
