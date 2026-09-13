import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Award,
  Mail,
  IdCard,
  Users,
  FolderKanban,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { fetchDashboardMetrics } from '../services/dashboardService';
import { getCertificateMetrics } from '../services/certificateFoundationService';
import { DashboardMetrics, CertificateMetrics } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalStudents: 0,
    totalColleges: 0,
    totalCourses: 0,
    totalBatches: 0,
    studentsWithId: 0,
    studentsAwaitingId: 0,
    idAssignmentRate: 0,
    batchesAwaitingId: 0,
    isLoading: true,
  });

  const [certMetrics, setCertMetrics] = useState<CertificateMetrics>({
    totalCertificates: 0,
    generatedCount: 0,
    pendingCount: 0,
    failedCount: 0,
  });

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, cm] = await Promise.all([
        fetchDashboardMetrics(),
        getCertificateMetrics().catch(() => ({
          totalCertificates: 0,
          generatedCount: 0,
          pendingCount: 0,
          failedCount: 0,
        })),
      ]);
      setMetrics(m);
      setCertMetrics(cm);
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const idCompletionRate =
    metrics.totalStudents > 0
      ? Math.round(((metrics.studentsWithId || 0) / metrics.totalStudents) * 100)
      : 0;

  const certCompletionRate =
    certMetrics.totalCertificates > 0
      ? Math.round((certMetrics.generatedCount / certMetrics.totalCertificates) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Operational Insights & Yield
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Key throughput indicators across student onboarding, ID assignment, and certificate delivery.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-center flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Enrolled</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {metrics.totalStudents}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Across {metrics.totalBatches} batches
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ID Assignment</span>
            <IdCard className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {idCompletionRate}%
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {metrics.studentsWithId || 0} assigned IDs
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Certificates Issued</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {certMetrics.generatedCount}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {certMetrics.pendingCount} pending issuance
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Partner Colleges</span>
            <FolderKanban className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {metrics.totalColleges}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {metrics.totalCourses} curriculum tracks
          </p>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Student ID Completion
            </h3>
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {metrics.studentsWithId || 0} / {metrics.totalStudents}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${idCompletionRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{metrics.studentsAwaitingId || 0} unassigned</span>
            <span className="font-semibold">{idCompletionRate}% completed</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Certificate Delivery Rate
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {certMetrics.generatedCount} / {certMetrics.totalCertificates}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${certCompletionRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{certMetrics.pendingCount} in queue</span>
            <span className="font-semibold">{certCompletionRate}% issued</span>
          </div>
        </div>
      </div>
    </div>
  );
};
