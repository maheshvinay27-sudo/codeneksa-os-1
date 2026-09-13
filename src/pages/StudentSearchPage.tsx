import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Users,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  Student,
  StudentSearchFilters as FiltersType,
  College,
  Course,
  Batch,
  NavSection,
} from '../types';
import {
  searchStudents,
  backfillNormalizedSearchFields,
  logStudentSearchAudit,
  logStudentProfileViewed,
} from '../services/studentSearchService';
import {
  fetchCollegesList,
  fetchCoursesList,
} from '../services/dataEmployeeService';
import { fetchAllBatches } from '../services/batchService';
import { StudentSearchBar } from '../components/studentSearch/StudentSearchBar';
import { StudentSearchFilters } from '../components/studentSearch/StudentSearchFilters';
import { StudentSearchResults } from '../components/studentSearch/StudentSearchResults';
import { StudentPagination } from '../components/studentSearch/StudentPagination';
import { StudentProfileDrawer } from '../components/studentSearch/StudentProfileDrawer';
import { BatchDetailModal } from '../components/batches/BatchDetailModal';

interface StudentSearchPageProps {
  onNavigate?: (section: NavSection) => void;
}

export const StudentSearchPage: React.FC<StudentSearchPageProps> = ({ onNavigate }) => {
  // Search Filters state
  const [filters, setFilters] = useState<FiltersType>({
    category: 'all',
    query: '',
    collegeId: 'all',
    courseId: 'all',
    batchId: 'all',
    status: 'all',
  });

  // Results state
  const [students, setStudents] = useState<Student[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [databaseIsEmpty, setDatabaseIsEmpty] = useState<boolean>(false);

  // Dropdown reference data
  const [colleges, setColleges] = useState<College[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // 360° Profile Drawer state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Batch Detail Modal state
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Ref to track search debounce
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load: Options and safe backfill check
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const [colList, courseList, batchList] = await Promise.all([
          fetchCollegesList(),
          fetchCoursesList(),
          fetchAllBatches(),
        ]);

        if (!isMounted) return;
        setColleges(colList);
        setCourses(courseList);
        setBatches(batchList);

        // Run safe, idempotent backfill in the background to ensure existing records have normalized fields
        backfillNormalizedSearchFields().catch((err) =>
          console.warn('Silent search backfill check encountered an error:', err)
        );
      } catch (err) {
        console.warn('Initialization error on Student Search page:', err);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Perform search execution
  const executeSearch = useCallback(
    async (currentFilters: FiltersType, targetPage: number = 1, shouldLogAudit: boolean = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await searchStudents(currentFilters, targetPage, 20);
        setStudents(res.students);
        setTotalCount(res.totalCount);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setHasSearched(true);

        if (!currentFilters.query && res.totalCount === 0 && currentFilters.batchId === 'all') {
          setDatabaseIsEmpty(true);
        } else {
          setDatabaseIsEmpty(false);
        }

        // Audit log when operator performs a search query
        if (shouldLogAudit && currentFilters.query.trim()) {
          logStudentSearchAudit(currentFilters.category, res.totalCount);
        }
      } catch (err) {
        console.error('Search failed:', err);
        setError('Unable to search students. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Trigger initial search on mount (browse all records)
  useEffect(() => {
    executeSearch(filters, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search when query or category changes
  const handleFilterChange = (newFilters: FiltersType) => {
    setFilters(newFilters);
    setPage(1);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // If query was modified, debounce 350ms; if dropdown changed, execute immediately
    const queryChanged = newFilters.query !== filters.query;
    if (queryChanged) {
      searchDebounceRef.current = setTimeout(() => {
        executeSearch(newFilters, 1, true);
      }, 350);
    } else {
      executeSearch(newFilters, 1, false);
    }
  };

  const handleQueryChange = (q: string) => {
    const updated = { ...filters, query: q };
    handleFilterChange(updated);
  };

  const handleImmediateSearch = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    executeSearch(filters, 1, true);
  };

  const handleClearQuery = () => {
    const updated = { ...filters, query: '' };
    setFilters(updated);
    setPage(1);
    executeSearch(updated, 1, false);
  };

  const handleResetFilters = () => {
    const reset = {
      ...filters,
      collegeId: 'all',
      courseId: 'all',
      batchId: 'all',
      status: 'all',
    };
    setFilters(reset);
    setPage(1);
    executeSearch(reset, 1, false);
  };

  const handlePageChange = (newPage: number) => {
    executeSearch(filters, newPage, false);
  };

  // Open 360° Profile Drawer
  const handleOpenProfile = (student: Student) => {
    setSelectedStudent(student);
    setIsDrawerOpen(true);
    // Audit log profile inspection
    logStudentProfileViewed(student.studentId || student.id, student.name);
  };

  const handleCloseProfile = () => {
    setIsDrawerOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Employee #4
            </span>
            <span className="text-xs text-slate-400">Operations Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Student Search Employee
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Find any student across Codeneksa OS by ID, name, hall ticket, email, or phone.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => executeSearch(filters, page, false)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh results"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Search Bar */}
      <StudentSearchBar
        query={filters.query}
        onChange={handleQueryChange}
        onSearch={handleImmediateSearch}
        onClear={handleClearQuery}
        isLoading={isLoading}
      />

      {/* Category Pills & Dropdown Filters */}
      <StudentSearchFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        colleges={colleges}
        courses={courses}
        batches={batches}
      />

      {/* Results Section */}
      <StudentSearchResults
        students={students}
        totalCount={totalCount}
        isLoading={isLoading}
        hasSearched={hasSearched}
        error={error}
        databaseIsEmpty={databaseIsEmpty}
        onOpenProfile={handleOpenProfile}
        onNavigateToDataEmployee={() => onNavigate?.('students')}
      />

      {/* Pagination */}
      <StudentPagination
        page={page}
        pageSize={20}
        totalCount={totalCount}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Student 360° Profile Drawer */}
      <StudentProfileDrawer
        student={selectedStudent}
        isOpen={isDrawerOpen}
        onClose={handleCloseProfile}
        onViewBatch={(batchId) => setSelectedBatchId(batchId)}
        onViewCollege={() => onNavigate?.('colleges')}
        onSendWelcomeEmail={() => {
          handleCloseProfile();
          onNavigate?.('welcome-mail');
        }}
      />

      {/* Batch Detail Modal (When opened from 360° Profile) */}
      <BatchDetailModal
        batchId={selectedBatchId}
        onClose={() => setSelectedBatchId(null)}
      />
    </div>
  );
};
