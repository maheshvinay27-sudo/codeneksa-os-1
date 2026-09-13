import React, { useState, useEffect, useCallback } from 'react';
import {
  IdCard,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  FolderKanban,
  Building2,
  BookOpen,
  GraduationCap,
  Hash,
} from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { StatCard } from '../dashboard/StatCard';
import { AssignIdModal } from './AssignIdModal';
import { BatchDetailModal } from '../batches/BatchDetailModal';
import {
  fetchStudentIdEmployeeOverview,
  getStudentIdCounter,
  formatCodeneksaId,
} from '../../services/studentIdService';
import {
  Batch,
  StudentIdEmployeeStats,
  SystemCounter,
  NavSection,
} from '../../types';

interface StudentIdEmployeeDashboardProps {
  onNavigate?: (section: NavSection) => void;
}

export const StudentIdEmployeeDashboard: React.FC<StudentIdEmployeeDashboardProps> = ({
  onNavigate,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<StudentIdEmployeeStats>({
    totalStudents: 0,
    studentsAwaitingId: 0,
    studentsAssignedId: 0,
    batchesAwaitingId: 0,
    totalBatches: 0,
  });

  const [batches, setBatches] = useState<
    (Batch & {
      totalStudents: number;
      assignedCount: number;
      pendingCount: number;
      idStatus: 'Awaiting ID Assignment' | 'IDs Assigned' | 'Partially Assigned';
    })[]
  >([]);

  const [counter, setCounter] = useState<SystemCounter | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'awaiting' | 'assigned'>('all');

  // Modal states
  const [assignModalBatch, setAssignModalBatch] = useState<Batch | null>(null);
  const [selectedBatchIdForRoster, setSelectedBatchIdForRoster] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [overview, counterData] = await Promise.all([
        fetchStudentIdEmployeeOverview(),
        getStudentIdCounter(),
      ]);
      setStats(overview.stats);
      setBatches(overview.batchesWithStats);
      setCounter(counterData);
    } catch (err) {
      console.warn('Failed to load Student ID Employee overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter batches
  const filteredBatches = batches.filter((b) => {
    if (statusFilter === 'awaiting' && b.pendingCount === 0) return false;
    if (statusFilter === 'assigned' && b.pendingCount > 0) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.name.toLowerCase().includes(q);
      const matchCode = (b.code || b.batchId || b.id).toLowerCase().includes(q);
      const matchCollege = b.collegeName?.toLowerCase().includes(q);
      const matchCourse = b.courseTitle?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchCollege && !matchCourse) return false;
    }

    return true;
  });

  const assignmentRate =
    stats.totalStudents > 0
      ? Math.round((stats.studentsAssignedId / stats.totalStudents) * 100)
      : 0;

  const nextId = formatCodeneksaId((counter?.currentNumber || 0) + 1);

  return (
    <div className="space-y-6">
      {/* DIGITAL EMPLOYEE IDENTITY BANNER */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 relative overflow-hidden shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-600/10">
              <IdCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
                  Student ID Employee
                </h2>
                <Badge variant="purple" size="sm">
                  Employee #3
                </Badge>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Active & Concurrency-Safe
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Single responsibility: Assigns permanent, unique Codeneksa Student IDs (CKS-XXXXXX)
                to students with temporary IDs. Guarantees global sequence atomicity, strict idempotency,
                and zero duplicate numbers across cohorts.
              </p>
            </div>
          </div>

          {/* Real-time Global Sequence Pill */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex-shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Next CKS ID
              </span>
              <span className="font-mono text-base font-extrabold text-indigo-300">
                {nextId}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Global Sequence
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {counter?.currentNumber || 0} Issued
              </span>
            </div>
            <button
              onClick={loadData}
              disabled={refreshing}
              title="Sync state with Firestore"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors ml-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* CORE 4 ID METRICS (Real Firestore Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<Users className="w-5 h-5" />}
          subtitle="Across all batches"
          emptyNotice="0 students in registry"
          isLoading={loading}
          onClick={() => onNavigate?.('students-all')}
        />

        <StatCard
          title="Students With IDs"
          value={stats.studentsAssignedId}
          icon={<ShieldCheck className="w-5 h-5" />}
          subtitle="Permanent CKS IDs assigned"
          emptyNotice="0 permanent IDs assigned"
          isLoading={loading}
          onClick={() => onNavigate?.('students-all')}
        />

        <StatCard
          title="Students Awaiting IDs"
          value={stats.studentsAwaitingId}
          icon={<AlertCircle className="w-5 h-5 text-amber-400" />}
          subtitle="Have temporary ref IDs"
          emptyNotice="0 awaiting assignment"
          isLoading={loading}
        />

        <StatCard
          title="ID Assignment Rate"
          value={`${assignmentRate}%`}
          icon={<Sparkles className="w-5 h-5 text-indigo-400" />}
          subtitle={`${stats.studentsAssignedId} of ${stats.totalStudents} students`}
          emptyNotice="0% assigned"
          isLoading={loading}
        />
      </div>

      {/* BATCH ROSTER & ID ASSIGNMENT WORKBENCH */}
      <Card>
        <CardHeader
          title="Batch Cohorts & Student ID Assignment"
          subtitle="Select any cohort to review student IDs, preview sequence allocations, or trigger atomic assignment"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadData}
                disabled={refreshing}
                className="text-xs text-slate-400 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Cohorts
              </Button>
            </div>
          }
        />

        {/* Filter controls */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search cohort by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs self-stretch sm:self-auto justify-center">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Cohorts ({batches.length})
            </button>
            <button
              onClick={() => setStatusFilter('awaiting')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'awaiting'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Awaiting IDs ({stats.batchesAwaitingId})
            </button>
            <button
              onClick={() => setStatusFilter('assigned')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'assigned'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              IDs Assigned ({batches.length - stats.batchesAwaitingId})
            </button>
          </div>
        </div>

        {/* Batches Table */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-xs text-slate-400">Loading cohort cohorts and assignment statuses...</p>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <FolderKanban className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No cohorts matching your criteria</p>
            <p className="text-slate-500 mt-1">
              Upload students via the Data Employee to initialize new batches.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Cohort / Batch</th>
                  <th className="py-3 px-4">College</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Students</th>
                  <th className="py-3 px-4">ID Assignment Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredBatches.map((batch) => {
                  const percentAssigned =
                    batch.totalStudents > 0
                      ? Math.round((batch.assignedCount / batch.totalStudents) * 100)
                      : 0;

                  return (
                    <tr key={batch.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px]">
                            <FolderKanban className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold block">{batch.name}</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {batch.code || batch.batchId || batch.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{batch.collegeName || '—'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <BookOpen className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{batch.courseTitle || '—'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                        {batch.totalStudents}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1 w-36">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">
                              {batch.assignedCount} / {batch.totalStudents}
                            </span>
                            <span className="font-semibold text-slate-300">
                              {percentAssigned}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                percentAssigned === 100
                                  ? 'bg-emerald-500'
                                  : percentAssigned > 0
                                  ? 'bg-indigo-500'
                                  : 'bg-slate-700'
                              }`}
                              style={{ width: `${percentAssigned}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {batch.idStatus === 'IDs Assigned' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            IDs Assigned
                          </span>
                        ) : batch.idStatus === 'Partially Assigned' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            Partially Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Awaiting ID Assignment
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBatchIdForRoster(batch.id)}
                            className="text-slate-400 hover:text-white"
                          >
                            Roster
                          </Button>

                          <Button
                            variant={batch.pendingCount > 0 ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setAssignModalBatch(batch)}
                            className={
                              batch.pendingCount > 0
                                ? 'shadow-sm shadow-indigo-600/20 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                            {batch.pendingCount > 0 ? 'Assign IDs' : 'Verify IDs'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL: Assign Permanent IDs */}
      {assignModalBatch && (
        <AssignIdModal
          isOpen={!!assignModalBatch}
          onClose={() => setAssignModalBatch(null)}
          batch={assignModalBatch}
          onAssignmentSuccess={() => {
            loadData();
          }}
          onViewRoster={(batchId) => {
            setSelectedBatchIdForRoster(batchId);
          }}
        />
      )}

      {/* MODAL: Batch Roster Detail */}
      {selectedBatchIdForRoster && (
        <BatchDetailModal
          batchId={selectedBatchIdForRoster}
          onClose={() => setSelectedBatchIdForRoster(null)}
        />
      )}
    </div>
  );
};
