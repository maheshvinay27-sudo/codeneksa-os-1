import React, { useState, useEffect } from 'react';
import {
  History,
  X,
  Search,
  FileDown,
  Eye,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { CertificateRecord } from '../../types';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Button } from '../common/Button';
import { useNotification } from '../../context/NotificationContext';

interface CertificateHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CertificateHistoryModal: React.FC<CertificateHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { error } = useNotification();
  const [records, setRecords] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GENERATED' | 'PENDING' | 'FAILED'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<CertificateRecord | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'certificates'), orderBy('createdAt', 'desc'), limit(150));
      const snap = await getDocs(q);
      const list: CertificateRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<CertificateRecord, 'id'>) });
      });
      setRecords(list);
    } catch (err) {
      error('Fetch Error', 'Failed to retrieve certificate records from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecords();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.certificateNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.courseProgram?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDownload = (rec: CertificateRecord) => {
    if (rec.fileUrl) {
      window.open(rec.fileUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white text-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Certificate Issuance History
              </h2>
              <p className="text-xs text-slate-500">
                Search and audit all officially generated student certificates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecords}
              disabled={loading}
              className="text-xs text-slate-600 border-slate-200 hover:bg-slate-100"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or cert #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-center">
            {(['ALL', 'GENERATED', 'PENDING', 'FAILED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading certificate records...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm font-semibold text-slate-600">No certificate records found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery
                  ? 'No records matched your search query.'
                  : 'Generated certificates will appear here permanently.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Certificate No.</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Course / College</th>
                    <th className="px-4 py-3">Generated Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                        {rec.certificateNumber}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {rec.studentName}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {rec.courseProgram || 'Certification Course'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(rec.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === 'GENERATED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rec.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {rec.status === 'GENERATED' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rec.fileUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(rec)}
                              className="px-2 py-1 text-[11px] h-7 text-slate-700 hover:text-indigo-600 border-slate-200"
                              title="View / Download PDF"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View PDF
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filtered.length} of {records.length} records</span>
          <Button variant="outline" size="sm" onClick={onClose} className="border-slate-300">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
