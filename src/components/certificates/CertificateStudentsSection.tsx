import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  ChevronRight,
  ShieldAlert,
  FileCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Student, CertificateTemplate, CertificateRecord } from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  checkStudentEligibility,
  createPendingCertificateRecord,
} from '../../services/certificateFoundationService';
import { useNotification } from '../../context/NotificationContext';

interface CertificateStudentsSectionProps {
  students: Student[];
  certificateRecords: CertificateRecord[];
  activeTemplate: CertificateTemplate | null;
  isLoading: boolean;
  onRefresh: () => void;
  onViewRecord?: (record: CertificateRecord) => void;
}

export const CertificateStudentsSection: React.FC<CertificateStudentsSectionProps> = ({
  students,
  certificateRecords,
  activeTemplate,
  isLoading,
  onRefresh,
  onViewRecord,
}) => {
  const { success, error, warning } = useNotification();

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'eligible' | 'ineligible'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Staging Modal State
  const [selectedStudentForRecord, setSelectedStudentForRecord] = useState<Student | null>(null);
  const [isStaging, setIsStaging] = useState(false);

  // Derive unique batches & colleges for dropdowns
  const batches = useMemo(() => {
    const list = Array.from(new Set(students.map((s) => s.batch).filter(Boolean))) as string[];
    return list.sort();
  }, [students]);

  const colleges = useMemo(() => {
    const list = Array.from(new Set(students.map((s) => s.college).filter(Boolean))) as string[];
    return list.sort();
  }, [students]);

  // Index certificate records by studentId for instantaneous lookup
  const recordsMap = useMemo(() => {
    const map = new Map<string, CertificateRecord>();
    certificateRecords.forEach((r) => {
      if (r.studentId) map.set(r.studentId, r);
      if (r.studentDocId) map.set(r.studentDocId, r);
    });
    return map;
  }, [certificateRecords]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const eligibility = checkStudentEligibility(student);

      // Eligibility filter
      if (eligibilityFilter === 'eligible' && !eligibility.eligible) return false;
      if (eligibilityFilter === 'ineligible' && eligibility.eligible) return false;

      // Batch filter
      if (selectedBatch !== 'all' && student.batch !== selectedBatch) return false;

      // College filter
      if (selectedCollege !== 'all' && student.college !== selectedCollege) return false;

      // Status filter
      const existingCert = recordsMap.get(student.studentId || '') || recordsMap.get(student.id);
      const currentCertStatus = existingCert?.status || student.certificateStatus || 'NOT_GENERATED';
      if (statusFilter !== 'all' && currentCertStatus !== statusFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = student.name?.toLowerCase().includes(query);
        const matchesId = student.studentId?.toLowerCase().includes(query);
        const matchesCollege = student.college?.toLowerCase().includes(query);
        const matchesCourse = student.course?.toLowerCase().includes(query);
        const matchesEmail = student.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesCollege && !matchesCourse && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [students, searchTerm, selectedBatch, selectedCollege, eligibilityFilter, statusFilter, recordsMap]);

  // Paginated students
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  // Initiate certificate record staging for a student
  const handleInitiateRecord = async () => {
    if (!selectedStudentForRecord) return;

    if (!activeTemplate) {
      warning('Active Template Required', 'Please upload and set an active certificate template first.');
      return;
    }

    setIsStaging(true);
    try {
      const record = await createPendingCertificateRecord(
        selectedStudentForRecord,
        activeTemplate
      );
      success(
        'Certificate Record Staged',
        `Allocated certificate number ${record.certificateNumber} for ${record.studentName} in PENDING status.`
      );
      setSelectedStudentForRecord(null);
      onRefresh();
    } catch (err: unknown) {
      error(
        'Allocation Failed',
        err instanceof Error ? err.message : 'Could not allocate certificate record.'
      );
    } finally {
      setIsStaging(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Section 3
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Live Student Records
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-100 mt-1">Students Database</h3>
          <p className="text-xs text-slate-400">
            Loaded directly from existing master student records. Displays real-time eligibility, IDs, and staging actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Showing <strong className="text-slate-200">{filteredStudents.length}</strong> of{' '}
            <strong className="text-slate-200">{students.length}</strong> students
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Name, Codeneksa ID, College..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Batch Selector */}
          <div>
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Batches ({batches.length})</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* College Selector */}
          <div>
            <select
              value={selectedCollege}
              onChange={(e) => {
                setSelectedCollege(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 truncate"
            >
              <option value="all">All Colleges ({colleges.length})</option>
              {colleges.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Eligibility Filter */}
          <div>
            <select
              value={eligibilityFilter}
              onChange={(e) => {
                setEligibilityFilter(e.target.value as 'all' | 'eligible' | 'ineligible');
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Eligibility</option>
              <option value="eligible">Eligible Only (Has CKS- ID)</option>
              <option value="ineligible">Not Eligible (Missing ID)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Student Records Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 select-none">
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider w-12 text-center">
                  S.No
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  Student Name
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  Codeneksa ID
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  College
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  Course
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  Batch
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  Certificate Status
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold">No matching student records found</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Adjust your search term or filters to view student records.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, idx) => {
                  const sNo = (currentPage - 1) * itemsPerPage + idx + 1;
                  const eligibility = checkStudentEligibility(student);
                  const existingCert =
                    recordsMap.get(student.studentId || '') || recordsMap.get(student.id);
                  const hasPermanentId =
                    student.studentId && student.studentId.startsWith('CKS-');

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* S.No */}
                      <td className="py-3 px-3.5 text-center font-mono text-slate-500">
                        {sNo}
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-3.5 font-semibold text-slate-100">
                        <div className="flex flex-col">
                          <span>{student.name}</span>
                          <span className="text-[10px] text-slate-500 truncate">
                            {student.email || 'No email registered'}
                          </span>
                        </div>
                      </td>

                      {/* Codeneksa ID */}
                      <td className="py-3 px-3.5 font-mono">
                        {hasPermanentId ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {student.studentId}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {student.studentId || 'UNASSIGNED'}
                          </span>
                        )}
                      </td>

                      {/* College */}
                      <td className="py-3 px-3.5 text-slate-300 max-w-[180px] truncate" title={student.college}>
                        {student.college || '—'}
                      </td>

                      {/* Course */}
                      <td className="py-3 px-3.5 text-slate-300 max-w-[150px] truncate" title={student.course}>
                        {student.course || '—'}
                      </td>

                      {/* Batch */}
                      <td className="py-3 px-3.5 text-slate-400 font-mono">
                        {student.batch || '—'}
                      </td>

                      {/* Certificate Status / Eligibility */}
                      <td className="py-3 px-3.5">
                        {!eligibility.eligible ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20" title={eligibility.reason}>
                            <ShieldAlert className="w-3 h-3" />
                            <span>NOT ELIGIBLE</span>
                          </div>
                        ) : existingCert ? (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                                existingCert.status === 'GENERATED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {existingCert.status === 'GENERATED' ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              <span>{existingCert.status}</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {existingCert.certificateNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            NOT GENERATED
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 text-right">
                        {!eligibility.eligible ? (
                          <span
                            className="text-[11px] text-slate-500 cursor-help"
                            title={eligibility.reason || 'Permanent Codeneksa Student ID required.'}
                          >
                            ID Required
                          </span>
                        ) : existingCert ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewRecord?.(existingCert)}
                            className="h-7 text-[11px] px-2.5"
                          >
                            View Record
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setSelectedStudentForRecord(student)}
                            className="h-7 text-[11px] px-2.5 inline-flex items-center gap-1"
                          >
                            <Award className="w-3 h-3" />
                            <span>Stage Record</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page <strong className="text-slate-200">{currentPage}</strong> of{' '}
              <strong className="text-slate-200">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 px-2 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 px-2 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stage Certificate Record Confirmation Modal */}
      <Modal
        isOpen={!!selectedStudentForRecord}
        onClose={() => setSelectedStudentForRecord(null)}
        title="Initiate Certificate Record (Phase 6A)"
      >
        {selectedStudentForRecord && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
              <strong>Phase 6A Foundation:</strong> This will allocate a unique certificate sequence number from{' '}
              <code className="font-mono text-white">/systemCounters/certificateNumber</code> and create a record in{' '}
              <code className="font-mono text-white">/certificates</code> in <span className="font-bold text-amber-400">PENDING</span> status. Duplicate protection ensures this student cannot be assigned duplicate certificate numbers.
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-100">{selectedStudentForRecord.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Permanent Codeneksa ID:</span>
                <span className="font-mono font-bold text-indigo-400">
                  {selectedStudentForRecord.studentId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">College:</span>
                <span className="text-slate-200">{selectedStudentForRecord.college}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Course Program:</span>
                <span className="text-slate-200">{selectedStudentForRecord.course}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Batch:</span>
                <span className="font-mono text-slate-200">{selectedStudentForRecord.batch}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-500">Active Template:</span>
                <span className="font-semibold text-slate-200">
                  {activeTemplate ? (
                    `${activeTemplate.name} (v${activeTemplate.version})`
                  ) : (
                    <span className="text-rose-400">No active template</span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudentForRecord(null)}
                disabled={isStaging}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleInitiateRecord}
                disabled={isStaging || !activeTemplate}
                className="flex items-center gap-1.5"
              >
                {isStaging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Allocating Sequence Number...</span>
                  </>
                ) : (
                  <>
                    <Award className="w-3.5 h-3.5" />
                    <span>Allocate Certificate Record</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
