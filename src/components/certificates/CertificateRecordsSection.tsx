import React, { useState, useMemo } from 'react';
import {
  Award,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  User,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { CertificateRecord } from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useNotification } from '../../context/NotificationContext';

interface CertificateRecordsSectionProps {
  records: CertificateRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  selectedRecordModal?: CertificateRecord | null;
  onCloseRecordModal?: () => void;
}

export const CertificateRecordsSection: React.FC<CertificateRecordsSectionProps> = ({
  records,
  isLoading,
  onRefresh,
  selectedRecordModal,
  onCloseRecordModal,
}) => {
  const { success } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [inspectRecord, setInspectRecord] = useState<CertificateRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Derive unique batches
  const batches = useMemo(() => {
    const list = Array.from(
      new Set(records.map((r) => r.batchName || r.batchId).filter(Boolean))
    ) as string[];
    return list.sort();
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (batchFilter !== 'all' && (r.batchName !== batchFilter && r.batchId !== batchFilter)) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNum = r.certificateNumber?.toLowerCase().includes(query);
        const matchesStudent = r.studentName?.toLowerCase().includes(query);
        const matchesId = r.studentId?.toLowerCase().includes(query);
        const matchesCollege = r.collegeName?.toLowerCase().includes(query);
        if (!matchesNum && !matchesStudent && !matchesId && !matchesCollege) {
          return false;
        }
      }

      return true;
    });
  }, [records, searchTerm, statusFilter, batchFilter]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    success('Copied to Clipboard', text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeModalRecord = selectedRecordModal || inspectRecord;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Section 4
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Firestore Records
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-100 mt-1">Certificate Records</h3>
          <p className="text-xs text-slate-400">
            Immutable log of allocated certificate numbers, student linkages, and template versions in /certificates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Showing <strong className="text-slate-200">{filteredRecords.length}</strong> of{' '}
            <strong className="text-slate-200">{records.length}</strong> certificates
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
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
              placeholder="Search by Certificate #, Student Name, Student ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending (Staged)</option>
              <option value="GENERATED">Generated</option>
              <option value="GENERATING">Generating</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Batch filter */}
          <div>
            <select
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 truncate"
            >
              <option value="all">All Batches ({batches.length})</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 select-none">
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  Certificate #
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  Student Name & ID
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  College & Course
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  Batch
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  Template
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider">
                  Staged Date
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-right">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold">No certificate records found</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Stage a certificate record from the Students section above to allocate a number.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((cert) => (
                  <tr
                    key={cert.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Certificate # */}
                    <td className="py-3 px-3.5 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-indigo-400">
                          {cert.certificateNumber}
                        </span>
                        <button
                          onClick={() => handleCopy(cert.certificateNumber, cert.id)}
                          className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                          title="Copy certificate number"
                        >
                          {copiedId === cert.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Student */}
                    <td className="py-3 px-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-100">{cert.studentName}</span>
                        <span className="text-[10px] font-mono text-indigo-300">
                          {cert.studentId}
                        </span>
                      </div>
                    </td>

                    {/* College & Course */}
                    <td className="py-3 px-3.5 max-w-[200px]">
                      <div className="flex flex-col truncate">
                        <span className="text-slate-200 truncate" title={cert.collegeName}>
                          {cert.collegeName}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate" title={cert.courseProgram}>
                          {cert.courseProgram}
                        </span>
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="py-3 px-3.5 font-mono text-slate-400">
                      {cert.batchName || cert.batchId || '—'}
                    </td>

                    {/* Template */}
                    <td className="py-3 px-3.5 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        v{cert.templateVersion}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          cert.status === 'GENERATED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : cert.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {cert.status === 'GENERATED' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : cert.status === 'PENDING' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        <span>{cert.status}</span>
                      </span>
                    </td>

                    {/* Staged Date */}
                    <td className="py-3 px-3.5 text-slate-400 text-[11px]">
                      {new Date(cert.createdAt).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectRecord(cert)}
                        className="h-7 text-[11px] px-2.5"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      {/* Certificate Record Inspection Modal */}
      <Modal
        isOpen={!!activeModalRecord}
        onClose={() => {
          setInspectRecord(null);
          onCloseRecordModal?.();
        }}
        title={`Certificate Record: ${activeModalRecord?.certificateNumber || ''}`}
      >
        {activeModalRecord && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Certificate Number</span>
                <span className="font-mono font-bold text-indigo-400">
                  {activeModalRecord.certificateNumber}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-amber-400">{activeModalRecord.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Student Name</span>
                <span className="font-semibold text-slate-100">{activeModalRecord.studentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Codeneksa Student ID</span>
                <span className="font-mono text-indigo-300">{activeModalRecord.studentId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">College</span>
                <span className="text-slate-200">{activeModalRecord.collegeName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Course Program</span>
                <span className="text-slate-200">{activeModalRecord.courseProgram}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Batch</span>
                <span className="font-mono text-slate-200">
                  {activeModalRecord.batchName || activeModalRecord.batchId}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Template Version</span>
                <span className="font-mono text-slate-200">
                  Version {activeModalRecord.templateVersion} ({activeModalRecord.templateId})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Allocated By</span>
                <span className="text-slate-200">{activeModalRecord.generatedBy}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Created Timestamp</span>
                <span className="font-mono text-slate-400">
                  {new Date(activeModalRecord.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
              <strong>Phase 6A Foundation:</strong> This record is securely staged in Firestore with its unique sequential number. In Phase 6B, the rendering engine will generate the verified PDF and upload to Storage.
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInspectRecord(null);
                  onCloseRecordModal?.();
                }}
              >
                Close Details
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
