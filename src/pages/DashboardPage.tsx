import React, { useEffect, useState, useCallback } from 'react';
import {
  Database,
  IdCard,
  Search,
  Mail,
  Award,
  BookOpen,
  RefreshCw,
  Check,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { EmployeeCard } from '../components/dashboard/EmployeeCard';
import { DataEmployeeModal } from '../components/dataEmployee/DataEmployeeModal';
import { BatchDetailModal } from '../components/batches/BatchDetailModal';
import { fetchDashboardMetrics, fetchRecentActivities } from '../services/dashboardService';
import { getCertificateMetrics } from '../services/certificateFoundationService';
import { DashboardMetrics, ActivityLog, NavSection, CertificateMetrics } from '../types';

interface DashboardPageProps {
  onNavigate: (section: NavSection) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalStudents: 0,
    studentsWithId: 0,
    studentsAwaitingId: 0,
    idAssignmentRate: 0,
    totalColleges: 0,
    totalCourses: 0,
    totalBatches: 0,
    batchesAwaitingId: 0,
    totalEmails: 0,
    isLoading: true,
  });

  const [certMetrics, setCertMetrics] = useState<CertificateMetrics>({
    totalCertificates: 0,
    generatedCount: 0,
    pendingCount: 0,
    failedCount: 0,
  });

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [m, a, cm] = await Promise.all([
        fetchDashboardMetrics(),
        fetchRecentActivities(),
        getCertificateMetrics().catch(() => ({
          totalCertificates: 0,
          generatedCount: 0,
          pendingCount: 0,
          failedCount: 0,
        })),
      ]);
      setMetrics(m);
      setActivities(a);
      setCertMetrics(cm);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-8">
      {/* COMMAND CENTER HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="space-y-1.5 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI Operations Workforce Active
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
            “Hey Boss 👋 I’m ready! Assign me the task, hit RUN, and relax. I’ll take care of the rest.” 😎🤖
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Codeneksa OS Digital Operations Suite • Autonomous data ingestion, ID card assignment, certificate issuance & credential dispatch.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isRefreshing}
          className="self-start sm:self-center shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
          <span>Sync Realtime</span>
        </button>
      </div>

      {/* COMPACT PREMIUM METRICS (Compact high-level information) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Students */}
        <div
          onClick={() => onNavigate('students-all')}
          className="cursor-pointer group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
        >
          <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {metrics.isLoading ? '—' : metrics.totalStudents}
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Students
          </div>
        </div>

        {/* Batches */}
        <div
          onClick={() => onNavigate('students-batches')}
          className="cursor-pointer group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
        >
          <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {metrics.isLoading ? '—' : metrics.totalBatches}
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Batches
          </div>
        </div>

        {/* Certificates */}
        <div
          onClick={() => onNavigate('certificates')}
          className="cursor-pointer group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
        >
          <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {metrics.isLoading ? '—' : certMetrics.totalCertificates}
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Certificates
          </div>
        </div>

        {/* Emails */}
        <div
          onClick={() => onNavigate('communication')}
          className="cursor-pointer group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
        >
          <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {metrics.isLoading ? '—' : (metrics.totalEmails ?? 0)}
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Emails
          </div>
        </div>
      </div>

      {/* YOUR EMPLOYEES (The main visual element) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              Your Employees
            </h2>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            6 autonomous agents active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 01 Data Employee */}
          <EmployeeCard
            number="01"
            icon={Database}
            name="Data Employee"
            purpose="Process student data automatically."
            status="READY"
            metric={`${metrics.totalStudents} students registered`}
            onRun={() => setIsDataModalOpen(true)}
          />

          {/* 02 Student ID Employee */}
          <EmployeeCard
            number="02"
            icon={IdCard}
            name="Student ID Employee"
            purpose="Assign permanent IDs."
            status="READY"
            metric={
              metrics.studentsAwaitingId > 0
                ? `${metrics.studentsAwaitingId} awaiting assignment`
                : `${metrics.studentsWithId} IDs assigned`
            }
            onRun={() => onNavigate('students-id-employee')}
          />

          {/* 03 Search Employee */}
          <EmployeeCard
            number="03"
            icon={Search}
            name="Search Employee"
            purpose="Find any student."
            status="READY"
            metric="Instant profile lookup"
            onRun={() => onNavigate('students-search')}
          />

          {/* 04 Welcome Mail Employee */}
          <EmployeeCard
            number="04"
            icon={Mail}
            name="Welcome Mail Employee"
            purpose="Send student emails."
            status="READY"
            metric={`${metrics.totalEmails || 0} dispatched`}
            onRun={() => onNavigate('communication')}
          />

          {/* 05 Certificate Employee */}
          <EmployeeCard
            number="05"
            icon={Award}
            name="Certificate Employee"
            purpose="Generate certificates."
            status="READY"
            metric={`${certMetrics.generatedCount} issued`}
            onRun={() => onNavigate('certificates')}
          />

          {/* 06 Course Employee */}
          <EmployeeCard
            number="06"
            icon={BookOpen}
            name="Course Employee"
            purpose="Manage courses."
            status="READY"
            metric={`${metrics.totalCourses} curriculum programs`}
            onRun={() => onNavigate('courses')}
          />
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
            Recent Activity
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Realtime event stream
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
          {activities.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {activities.slice(0, 6).map((item) => (
                <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                    <span className="text-xs text-slate-800 dark:text-slate-200 truncate font-medium">
                      {item.description}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                <span>{metrics.totalStudents > 0 ? `${metrics.totalStudents} students imported` : 'Student intake pipeline initialized'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                <span>{metrics.studentsWithId > 0 ? `${metrics.studentsWithId} IDs assigned` : 'Permanent ID generator operational'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                <span>Welcome emails dispatched</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                <span>Certificates generated</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* The Data Employee Modal */}
      <DataEmployeeModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onImportSuccess={() => {
          loadData();
        }}
        onViewBatch={(bId) => {
          setSelectedBatchId(bId);
        }}
        onViewStudents={() => {
          onNavigate('students-all');
        }}
      />

      {/* Batch Details Modal */}
      <BatchDetailModal
        batchId={selectedBatchId}
        onClose={() => setSelectedBatchId(null)}
      />
    </div>
  );
};
