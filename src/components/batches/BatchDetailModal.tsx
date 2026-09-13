import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Building2,
  BookOpen,
  Calendar,
  Users,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Download,
  Clock,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Batch, Student } from '../../types';
import { fetchBatchById, fetchStudentsByBatch } from '../../services/batchService';
import * as XLSX from 'xlsx';

interface BatchDetailModalProps {
  batchId: string | null;
  onClose: () => void;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({ batchId, onClose }) => {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!batchId) return;

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const [batchData, studentList] = await Promise.all([
          fetchBatchById(batchId),
          fetchStudentsByBatch(batchId),
        ]);
        if (isMounted) {
          setBatch(batchData);
          setStudents(studentList);
        }
      } catch (err) {
        console.error('Failed to load batch details:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [batchId]);

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.hallTicketNumber && s.hallTicketNumber.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.studentId && s.studentId.toLowerCase().includes(q))
    );
  });

  const handleExportRoster = () => {
    if (!batch || students.length === 0) return;

    const dataToExport = students.map((s, idx) => ({
      '#': idx + 1,
      'Codeneksa ID':
        s.studentIdStatus === 'ASSIGNED' || (s.studentId && s.studentId.startsWith('CKS-'))
          ? s.studentId
          : 'PENDING',
      'Student Name': s.name,
      'Hall Ticket Number': s.hallTicketNumber || '',
      'Email Address': s.email || '',
      'Phone Number': s.phone || '',
      'College': s.college || batch.collegeName || '',
      'Course': s.course || batch.courseTitle || '',
      'Temporary Ref ID': s.tempStudentId || s.studentId || '',
      'Status': s.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roster');
    XLSX.writeFile(workbook, `${batch.code || batch.name}_roster.xlsx`);
  };

  return (
    <Modal
      isOpen={!!batchId}
      onClose={onClose}
      title=""
      description=""
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-slate-400">Loading cohort details from Cloud Firestore...</p>
        </div>
      ) : !batch ? (
        <div className="py-12 text-center text-xs text-slate-400">
          <p>Batch not found or no longer exists.</p>
          <Button variant="outline" size="sm" onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-5 -mt-3">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-100">{batch.name}</h3>
                  <Badge variant="purple" size="sm">
                    {batch.code || batch.batchId || batch.id}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Academic cohort managed in Codeneksa OS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportRoster}
                disabled={students.length === 0}
                className="text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Roster
              </Button>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>College</span>
              </div>
              <p className="font-semibold text-slate-200 truncate">
                {batch.collegeName || 'Main Campus'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Course</span>
              </div>
              <p className="font-semibold text-slate-200 truncate">
                {batch.courseTitle || 'Curriculum'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Enrolled Students</span>
              </div>
              <p className="font-black text-slate-200 font-mono">
                {batch.studentCount ?? students.length}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Created</span>
              </div>
              <p className="font-semibold text-slate-200">
                {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          {batch.sourceFileName && (
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                Source File: <strong className="text-slate-300">{batch.sourceFileName}</strong>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Ingested by Data Employee</span>
            </div>
          )}

          {/* Student Roster Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Student Roster ({students.length})
              </h4>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter roster..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-900 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">CODENEKSA ID</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Hall Ticket</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Reference ID</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        {searchQuery
                          ? 'No students matching the filter.'
                          : 'No students enrolled in this batch.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          {student.studentIdStatus === 'ASSIGNED' ||
                          (student.studentId && student.studentId.startsWith('CKS-')) ? (
                            <span className="font-bold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/30">
                              {student.studentId}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-100">
                          {student.name}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                          {student.hallTicketNumber || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                          {student.email || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                          {student.phone || '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                          {student.tempStudentId || (student.studentId?.startsWith('CKS-') ? '—' : student.studentId) || '—'}
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
