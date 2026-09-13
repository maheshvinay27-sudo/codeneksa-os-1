import React from 'react';
import {
  Search,
  Users,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Student } from '../../types';
import { StudentResultRow } from './StudentResultRow';

interface StudentSearchResultsProps {
  students: Student[];
  totalCount: number;
  isLoading: boolean;
  hasSearched: boolean;
  error: string | null;
  databaseIsEmpty: boolean;
  onOpenProfile: (student: Student) => void;
  onNavigateToDataEmployee: () => void;
}

export const StudentSearchResults: React.FC<StudentSearchResultsProps> = ({
  students,
  totalCount,
  isLoading,
  hasSearched,
  error,
  databaseIsEmpty,
  onOpenProfile,
  onNavigateToDataEmployee,
}) => {
  // 1. Error state
  if (error) {
    return (
      <div className="py-16 px-4 text-center rounded-2xl bg-slate-900/60 border border-rose-500/20">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-200 mb-1">
          Unable to search students
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Please check your network connection and try again.
        </p>
      </div>
    );
  }

  // 2. Empty database state
  if (databaseIsEmpty && !isLoading) {
    return (
      <div className="py-16 px-4 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-3">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-200 mb-1">
          No students in Codeneksa OS yet
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          Import student rosters via the Data Employee to begin searching and managing profiles.
        </p>
        <button
          type="button"
          onClick={onNavigateToDataEmployee}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
        >
          <span>Go to Data Employee</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 3. Loading state (Skeleton rows)
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <div className="h-4 w-40 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-800/60">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-slate-800 rounded" />
                  <div className="h-2.5 w-20 bg-slate-850 rounded" />
                </div>
              </div>
              <div className="h-3.5 w-24 bg-slate-800 rounded" />
              <div className="h-3.5 w-32 bg-slate-800 rounded" />
              <div className="h-6 w-16 bg-slate-800 rounded-full" />
              <div className="h-7 w-20 bg-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. Initial state (Before any search or filter performed)
  if (!hasSearched && students.length === 0) {
    return (
      <div className="py-20 px-4 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-3">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-200 mb-1">
          Search for a student
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Find any student by Codeneksa ID, temporary reference ID, student name, hall ticket, email, or phone.
        </p>
      </div>
    );
  }

  // 5. No results found state
  if (students.length === 0) {
    return (
      <div className="py-16 px-4 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-200 mb-1">
          No students found
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Try searching by Codeneksa ID, hall ticket, name, email or phone. Check for spelling or reset filters.
        </p>
      </div>
    );
  }

  // 6. Results found
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200">
            {totalCount} {totalCount === 1 ? 'student' : 'students'} found
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            (Click any row to open 360° Profile)
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3.5">Codeneksa ID</th>
              <th className="py-2.5 px-3.5">Student Name</th>
              <th className="py-2.5 px-3.5">Hall Ticket</th>
              <th className="py-2.5 px-3.5">College</th>
              <th className="py-2.5 px-3.5">Course</th>
              <th className="py-2.5 px-3.5">Batch</th>
              <th className="py-2.5 px-3.5">Email</th>
              <th className="py-2.5 px-3.5">Phone</th>
              <th className="py-2.5 px-3.5">Status</th>
              <th className="py-2.5 px-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <StudentResultRow
                key={student.id}
                student={student}
                onOpenProfile={onOpenProfile}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
