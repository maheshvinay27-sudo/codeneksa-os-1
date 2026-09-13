import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  FolderKanban,
  GraduationCap,
  Plus,
  Filter,
  FileSpreadsheet,
  Building2,
  BookOpen,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Eye,
  RefreshCw,
  Mail,
  IdCard,
} from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { NavSection, Student, Batch } from '../types';
import { fetchAllBatches } from '../services/batchService';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DataEmployeeModal } from '../components/dataEmployee/DataEmployeeModal';
import { downloadSampleExcelTemplate } from '../services/dataEmployeeService';
import { BatchDetailModal } from '../components/batches/BatchDetailModal';
import { StudentIdEmployeeDashboard } from '../components/studentIdEmployee/StudentIdEmployeeDashboard';
import { StudentSearchPage } from './StudentSearchPage';

interface StudentsPageProps {
  initialSubTab?: 'all' | 'batches' | 'search' | 'id-employee';
  onNavigate: (section: NavSection) => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  initialSubTab = 'all',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'batches' | 'search' | 'id-employee'>(initialSubTab);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Batches state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(true);

  // Students state
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Pagination for Students
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setActiveTab(initialSubTab);
  }, [initialSubTab]);

  // Load batches and students from Firestore
  const loadData = useCallback(async () => {
    setLoadingBatches(true);
    setLoadingStudents(true);
    try {
      const [batchList, studentSnap] = await Promise.all([
        fetchAllBatches(),
        getDocs(query(collection(db, 'students'), orderBy('createdAt', 'desc'), limit(300))),
      ]);

      setBatches(batchList);

      const stList: Student[] = [];
      studentSnap.forEach((doc) => {
        stList.push({ id: doc.id, ...(doc.data() as Omit<Student, 'id'>) });
      });
      setStudents(stList);
    } catch (err) {
      console.warn('Failed to load students or batches:', err);
    } finally {
      setLoadingBatches(false);
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter students based on batch selection and local search
  const filteredStudents = students.filter((s) => {
    if (selectedBatchFilter !== 'all' && s.batchId !== selectedBatchFilter && s.batch !== selectedBatchFilter) {
      return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchHtn = s.hallTicketNumber ? s.hallTicketNumber.toLowerCase().includes(q) : false;
      const matchEmail = s.email ? s.email.toLowerCase().includes(q) : false;
      const matchId = s.studentId ? s.studentId.toLowerCase().includes(q) : false;
      if (!matchName && !matchHtn && !matchEmail && !matchId) {
        return false;
      }
    }
    return true;
  });

  // Calculate paginated slices
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Page Header with Sub-navigation tabs & Global Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Student Management
            </h2>
            <Badge variant="purple" size="sm">
              Data Pipeline Active
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational registry for student records, academic cohorts, and automated spreadsheet ingestion
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Prominent Upload Student Data Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            icon={<UploadCloud className="w-3.5 h-3.5" />}
          >
            Upload Student Data
          </Button>

          {/* Download Blank Template */}
          <Button
            variant="outline"
            size="sm"
            onClick={downloadSampleExcelTemplate}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
            title="Download formatted Excel template for colleges"
          >
            Excel Template
          </Button>

          {/* Sub-navigation pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setActiveTab('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Students ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'batches'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Batches ({batches.length})
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'search'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Student Search
            </button>
            <button
              onClick={() => setActiveTab('id-employee')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'id-employee'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <IdCard className="w-3.5 h-3.5" />
              <span>Student ID Employee</span>
            </button>
            <button
              id="btn-nav-to-welcome-mail"
              onClick={() => onNavigate('communication')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all"
              title="Open Welcome Mail Employee"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              <span>Welcome Mail</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL STUDENTS                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'all' && (
        <Card>
          <CardHeader
            title="All Student Records"
            subtitle="Master student directory synchronized with Cloud Firestore"
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadData}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Refresh
                </Button>
                <Badge variant="purple" size="md">
                  Firestore: /students
                </Badge>
              </div>
            }
          />

          {loadingStudents ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <LoadingSpinner size="lg" />
              <p className="text-xs text-slate-400">Loading student directory from Cloud Firestore...</p>
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="w-8 h-8" />}
              title="No student records in Firestore yet"
              description="The Data Employee is ready to ingest student spreadsheets (CSV, XLSX, XLS), map columns, validate records, and initialize batches."
              actionLabel="Upload Student Data"
              onAction={() => setIsUploadModalOpen(true)}
            />
          ) : (
            <div className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {/* Search input */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => {
                      setSearchFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by name, hall ticket, email..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-900 dark:text-slate-200 focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
                  />
                </div>

                {/* Batch Filter dropdown */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">Filter Batch:</span>
                  <select
                    value={selectedBatchFilter}
                    onChange={(e) => {
                      setSelectedBatchFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-900 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="all">All Batches ({students.length} students)</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code || b.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table of Students */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3.5">Codeneksa ID</th>
                      <th className="py-3 px-3.5">Student Name</th>
                      <th className="py-3 px-3.5">Hall Ticket</th>
                      <th className="py-3 px-3.5">Email</th>
                      <th className="py-3 px-3.5">Phone</th>
                      <th className="py-3 px-3.5">College</th>
                      <th className="py-3 px-3.5">Course</th>
                      <th className="py-3 px-3.5">Batch</th>
                      <th className="py-3 px-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {paginatedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No students matching your search criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-3.5 font-mono text-[11px]">
                            {s.studentIdStatus === 'ASSIGNED' ||
                            (s.studentId && s.studentId.startsWith('CKS-')) ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                                {s.studentId}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                PENDING
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-slate-100">
                            {s.name}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                            {s.hallTicketNumber || '—'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                            {s.email || '—'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                            {s.phone || '—'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[140px]">
                            {s.college || '—'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[140px]">
                            {s.course || '—'}
                          </td>
                          <td className="py-3 px-3.5">
                            <span
                              onClick={() => {
                                if (s.batchId) setSelectedBatchId(s.batchId);
                              }}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-[11px] font-medium truncate max-w-[120px] block"
                            >
                              {s.batch || s.batchId || 'Cohort'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing {Math.min(filteredStudents.length, (currentPage - 1) * PAGE_SIZE + 1)} to{' '}
                  {Math.min(filteredStudents.length, currentPage * PAGE_SIZE)} of{' '}
                  <strong className="text-slate-900 dark:text-slate-200">{filteredStudents.length}</strong> students
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Previous
                  </Button>
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 text-xs"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BATCHES                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'batches' && (
        <Card>
          <CardHeader
            title="Academic Batch Cohorts"
            subtitle="Student cohorts organized by institution, curriculum, and upload batch"
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(true)}
                  icon={<UploadCloud className="w-3.5 h-3.5" />}
                >
                  Upload Student Data
                </Button>
                <Badge variant="purple" size="md">
                  Firestore: /batches
                </Badge>
              </div>
            }
          />

          {loadingBatches ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <LoadingSpinner size="lg" />
              <p className="text-xs text-slate-400">Loading batch cohorts from Cloud Firestore...</p>
            </div>
          ) : batches.length === 0 ? (
            <EmptyState
              icon={<FolderKanban className="w-8 h-8" />}
              title="No batches registered yet"
              description="Upload an Excel or CSV student spreadsheet to have The Data Employee automatically initialize a new batch cohort."
              actionLabel="Upload Student Data"
              onAction={() => setIsUploadModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Batch ID</th>
                    <th className="py-3 px-4">Batch Name</th>
                    <th className="py-3 px-4">Partner College</th>
                    <th className="py-3 px-4">Course Curriculum</th>
                    <th className="py-3 px-4 text-center">Students</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {b.code || b.batchId || b.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {b.name}
                        {b.sourceFileName && (
                          <span className="block text-[10px] font-normal text-slate-400 truncate max-w-xs">
                            File: {b.sourceFileName}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {b.collegeName || 'Main Campus'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {b.courseTitle || 'Curriculum'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          <Users className="w-3 h-3 mr-1" />
                          {b.studentCount ?? '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBatchId(b.id)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Batch
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STUDENT SEARCH EMPLOYEE                                            */}
      {/* ========================================================================= */}
      {activeTab === 'search' && (
        <StudentSearchPage onNavigate={onNavigate} />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STUDENT ID EMPLOYEE                                                */}
      {/* ========================================================================= */}
      {activeTab === 'id-employee' && (
        <StudentIdEmployeeDashboard onNavigate={onNavigate} />
      )}

      {/* The Data Employee Modal */}
      <DataEmployeeModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImportSuccess={() => {
          loadData();
        }}
        onViewBatch={(bId) => {
          setSelectedBatchId(bId);
          setActiveTab('batches');
        }}
        onViewStudents={() => {
          setActiveTab('all');
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
