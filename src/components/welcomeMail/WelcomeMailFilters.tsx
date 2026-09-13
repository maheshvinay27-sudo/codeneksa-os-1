import React from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';

interface WelcomeMailFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  collegeFilter: string;
  onCollegeChange: (val: string) => void;
  courseFilter: string;
  onCourseChange: (val: string) => void;
  colleges: string[];
  courses: string[];
  onClearFilters: () => void;
  totalFiltered: number;
}

export const WelcomeMailFilters: React.FC<WelcomeMailFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  collegeFilter,
  onCollegeChange,
  courseFilter,
  onCourseChange,
  colleges,
  courses,
  onClearFilters,
  totalFiltered,
}) => {
  const hasActiveFilters =
    Boolean(searchQuery) ||
    statusFilter !== 'ALL' ||
    Boolean(collegeFilter) ||
    Boolean(courseFilter);

  return (
    <div id="welcome-mail-filters" className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="input-welcome-mail-search"
            type="text"
            placeholder="Search student by Name, CKS ID, Email, Hall Ticket..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              id="btn-clear-mail-search"
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Email Status Filter */}
        <div className="flex items-center gap-2">
          <select
            id="select-mail-status-filter"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Email Statuses</option>
            <option value="NOT_SENT">Not Sent (Ready)</option>
            <option value="SENT">Delivered (Sent)</option>
            <option value="FAILED">Failed (Needs Retry)</option>
            <option value="QUEUED">Queued / Sending</option>
            <option value="MISSING_EMAIL">Missing Email Address</option>
          </select>

          {/* College Filter */}
          {colleges.length > 0 && (
            <select
              id="select-mail-college-filter"
              value={collegeFilter}
              onChange={(e) => onCollegeChange(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 max-w-[160px] truncate"
            >
              <option value="">All Colleges</option>
              {colleges.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Course Filter */}
          {courses.length > 0 && (
            <select
              id="select-mail-course-filter"
              value={courseFilter}
              onChange={(e) => onCourseChange(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 max-w-[140px] truncate"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              id="btn-clear-all-mail-filters"
              type="button"
              onClick={onClearFilters}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 transition-all"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>
          Showing <strong className="text-slate-200 font-mono">{totalFiltered}</strong> matching students
        </span>
      </div>
    </div>
  );
};
