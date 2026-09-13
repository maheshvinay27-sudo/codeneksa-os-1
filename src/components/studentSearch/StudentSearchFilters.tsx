import React from 'react';
import {
  Filter,
  Building2,
  BookOpen,
  FolderKanban,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { SearchCategory, StudentSearchFilters as FiltersType, College, Course, Batch } from '../../types';

interface StudentSearchFiltersProps {
  filters: FiltersType;
  onChange: (newFilters: FiltersType) => void;
  onReset: () => void;
  colleges: College[];
  courses: Course[];
  batches: Batch[];
}

const CATEGORY_TABS: { id: SearchCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'studentId', label: 'Codeneksa ID' },
  { id: 'name', label: 'Student Name' },
  { id: 'hallTicket', label: 'Hall Ticket' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'college', label: 'College' },
  { id: 'batch', label: 'Batch' },
];

export const StudentSearchFilters: React.FC<StudentSearchFiltersProps> = ({
  filters,
  onChange,
  onReset,
  colleges,
  courses,
  batches,
}) => {
  const activeSecondaryFilterCount =
    (filters.collegeId !== 'all' ? 1 : 0) +
    (filters.courseId !== 'all' ? 1 : 0) +
    (filters.batchId !== 'all' ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0);

  const handleCategoryChange = (cat: SearchCategory) => {
    onChange({ ...filters, category: cat });
  };

  return (
    <div className="space-y-3">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map((tab) => {
          const isActive = filters.category === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleCategoryChange(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-900/80 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dropdown Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
        {/* College Dropdown */}
        <div className="relative">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={filters.collegeId}
              onChange={(e) => onChange({ ...filters, collegeId: e.target.value })}
              className="w-full bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                All Colleges
              </option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Course Dropdown */}
        <div className="relative">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={filters.courseId}
              onChange={(e) => onChange({ ...filters, courseId: e.target.value })}
              className="w-full bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                All Courses
              </option>
              {courses.map((co) => (
                <option key={co.id} value={co.id} className="bg-slate-900 text-slate-200">
                  {co.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Batch Dropdown */}
        <div className="relative">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
            <FolderKanban className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={filters.batchId}
              onChange={(e) => onChange({ ...filters, batchId: e.target.value })}
              className="w-full bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                All Batches
              </option>
              {batches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-slate-200">
                  {b.name} ({b.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Dropdown & Reset Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={filters.status}
                onChange={(e) => onChange({ ...filters, status: e.target.value })}
                className="w-full bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
              >
                <option value="all" className="bg-slate-900 text-slate-200">
                  All Statuses
                </option>
                <option value="Active" className="bg-slate-900 text-slate-200">
                  Active
                </option>
                <option value="Inactive" className="bg-slate-900 text-slate-200">
                  Inactive
                </option>
                <option value="Suspended" className="bg-slate-900 text-slate-200">
                  Suspended
                </option>
              </select>
            </div>
          </div>

          {activeSecondaryFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-colors shrink-0"
              title="Reset dropdown filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
