import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  updateDoc,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  Student,
  StudentSearchFilters,
  StudentSearchResult,
  NormalizedSearchFields,
  ActivityActionType,
} from '../types';
import { recordActivity } from './dashboardService';
import { handleFirestoreError, OperationType } from './firestoreError';

/**
 * Normalizes an arbitrary search query string (trims whitespace, converts to lowercase)
 */
export function normalizeSearchTerm(term: string): string {
  return (term || '').trim().toLowerCase();
}

/**
 * Extracts digits from a phone number for normalized comparison
 */
export function normalizePhoneDigits(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

/**
 * Computes normalized search fields for any student record.
 * Designed to power fast, indexed Firestore queries.
 */
export function computeSearchFields(student: {
  name?: string;
  studentId?: string;
  tempStudentId?: string;
  hallTicketNumber?: string;
  email?: string;
  phone?: string;
  college?: string;
  batchId?: string;
}): NormalizedSearchFields {
  return {
    searchName: normalizeSearchTerm(student.name || ''),
    searchStudentId: normalizeSearchTerm(student.studentId || ''),
    searchTempStudentId: normalizeSearchTerm(student.tempStudentId || ''),
    searchHallTicket: normalizeSearchTerm(student.hallTicketNumber || ''),
    searchEmail: normalizeSearchTerm(student.email || ''),
    searchPhone: normalizePhoneDigits(student.phone || ''),
    searchCollege: normalizeSearchTerm(student.college || ''),
    searchBatchId: normalizeSearchTerm(student.batchId || ''),
  };
}

/**
 * Backfills normalized search fields for all existing students in Firestore.
 * Idempotent: Skips documents that already have normalized fields.
 * Never deletes or alters existing original fields.
 */
export async function backfillNormalizedSearchFields(): Promise<{
  totalChecked: number;
  updatedCount: number;
}> {
  try {
    const colRef = collection(db, 'students');
    const snap = await getDocs(colRef);
    let updatedCount = 0;

    for (const d of snap.docs) {
      const data = d.data() as Student;
      // Check if normalized fields are missing or incomplete
      const needsBackfill =
        !data.searchStudentId ||
        !data.searchName ||
        !data.searchHallTicket ||
        !data.searchEmail;

      if (needsBackfill) {
        const normalized = computeSearchFields(data);
        await updateDoc(doc(db, 'students', d.id), {
          ...normalized,
          updatedAt: new Date().toISOString(),
        });
        updatedCount++;
      }
    }

    return {
      totalChecked: snap.size,
      updatedCount,
    };
  } catch (error) {
    console.warn('Silent backfill check encountered an error:', error);
    return { totalChecked: 0, updatedCount: 0 };
  }
}

/**
 * Fast, production-safe student search service across Codeneksa OS.
 * Uses targeted Firestore queries, normalization, and in-memory deduplication
 * to deliver instantaneous lookups without loading the entire database.
 */
export async function searchStudents(
  filters: StudentSearchFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<StudentSearchResult> {
  const colRef = collection(db, 'students');
  const rawQuery = (filters.query || '').trim();
  const q = rawQuery.toLowerCase();
  const upperQ = rawQuery.toUpperCase();
  const digitsQ = normalizePhoneDigits(rawQuery);

  const studentsMap = new Map<string, Student>();

  const addDocsToMap = (docs: DocumentData[]) => {
    for (const d of docs) {
      const student = { id: d.id, ...d.data() } as Student;
      if (!studentsMap.has(student.id)) {
        studentsMap.set(student.id, student);
      }
    }
  };

  try {
    // -------------------------------------------------------------
    // CASE 1: Query string is EMPTY — Browse / Filter mode
    // -------------------------------------------------------------
    if (!rawQuery) {
      const constraints: QueryConstraint[] = [];

      if (filters.batchId && filters.batchId !== 'all') {
        constraints.push(where('batchId', '==', filters.batchId));
      }

      if (filters.collegeId && filters.collegeId !== 'all') {
        constraints.push(where('collegeId', '==', filters.collegeId));
      }

      if (filters.courseId && filters.courseId !== 'all') {
        constraints.push(where('courseId', '==', filters.courseId));
      }

      if (filters.status && filters.status !== 'all') {
        constraints.push(where('status', '==', filters.status.toLowerCase()));
      }

      // Order by createdAt descending for recent records
      constraints.push(orderBy('createdAt', 'desc'));
      // Limit to 200 to keep responses snappy
      constraints.push(limit(200));

      const snap = await getDocs(query(colRef, ...constraints));
      addDocsToMap(snap.docs);
    } else {
      // -------------------------------------------------------------
      // CASE 2: Search by Specific Category or ALL
      // -------------------------------------------------------------
      const queryPromises: Promise<any>[] = [];

      // Helper to safely execute a query without breaking the entire search if a composite index is missing
      const safeQuery = async (qConstraint: QueryConstraint[]) => {
        try {
          const s = await getDocs(query(colRef, ...qConstraint, limit(50)));
          return s.docs;
        } catch (err) {
          console.warn('Targeted query skipped or failed:', err);
          return [];
        }
      };

      const category = filters.category || 'all';

      // --- Student ID Queries ---
      if (category === 'all' || category === 'studentId') {
        queryPromises.push(safeQuery([where('studentId', '==', upperQ)]));
        queryPromises.push(safeQuery([where('studentId', '==', rawQuery)]));
        queryPromises.push(safeQuery([where('searchStudentId', '==', q)]));
        queryPromises.push(safeQuery([where('tempStudentId', '==', upperQ)]));
        queryPromises.push(safeQuery([where('searchTempStudentId', '==', q)]));

        // Prefix range queries for partial ID searches like "CKS-0000" or "cks-00"
        queryPromises.push(
          safeQuery([
            where('studentId', '>=', upperQ),
            where('studentId', '<=', upperQ + '\uf8ff'),
          ])
        );
        queryPromises.push(
          safeQuery([
            where('searchStudentId', '>=', q),
            where('searchStudentId', '<=', q + '\uf8ff'),
          ])
        );
      }

      // --- Hall Ticket Queries ---
      if (category === 'all' || category === 'hallTicket') {
        queryPromises.push(safeQuery([where('hallTicketNumber', '==', upperQ)]));
        queryPromises.push(safeQuery([where('hallTicketNumber', '==', rawQuery)]));
        queryPromises.push(safeQuery([where('searchHallTicket', '==', q)]));
        queryPromises.push(
          safeQuery([
            where('hallTicketNumber', '>=', upperQ),
            where('hallTicketNumber', '<=', upperQ + '\uf8ff'),
          ])
        );
        queryPromises.push(
          safeQuery([
            where('searchHallTicket', '>=', q),
            where('searchHallTicket', '<=', q + '\uf8ff'),
          ])
        );
      }

      // --- Email Queries ---
      if (category === 'all' || category === 'email') {
        queryPromises.push(safeQuery([where('email', '==', q)]));
        queryPromises.push(safeQuery([where('email', '==', rawQuery)]));
        queryPromises.push(safeQuery([where('searchEmail', '==', q)]));
        queryPromises.push(
          safeQuery([
            where('email', '>=', q),
            where('email', '<=', q + '\uf8ff'),
          ])
        );
        queryPromises.push(
          safeQuery([
            where('searchEmail', '>=', q),
            where('searchEmail', '<=', q + '\uf8ff'),
          ])
        );
      }

      // --- Name Queries ---
      if (category === 'all' || category === 'name') {
        queryPromises.push(safeQuery([where('name', '==', rawQuery)]));
        queryPromises.push(safeQuery([where('searchName', '==', q)]));
        queryPromises.push(
          safeQuery([
            where('name', '>=', rawQuery),
            where('name', '<=', rawQuery + '\uf8ff'),
          ])
        );
        queryPromises.push(
          safeQuery([
            where('searchName', '>=', q),
            where('searchName', '<=', q + '\uf8ff'),
          ])
        );
      }

      // --- Phone Queries ---
      if (category === 'all' || category === 'phone') {
        queryPromises.push(safeQuery([where('phone', '==', rawQuery)]));
        if (digitsQ) {
          queryPromises.push(safeQuery([where('phone', '==', digitsQ)]));
          queryPromises.push(safeQuery([where('searchPhone', '==', digitsQ)]));
        }
      }

      // --- College Queries ---
      if (category === 'all' || category === 'college') {
        queryPromises.push(safeQuery([where('college', '==', rawQuery)]));
        queryPromises.push(safeQuery([where('searchCollege', '==', q)]));
        queryPromises.push(
          safeQuery([
            where('college', '>=', rawQuery),
            where('college', '<=', rawQuery + '\uf8ff'),
          ])
        );
        queryPromises.push(
          safeQuery([
            where('searchCollege', '>=', q),
            where('searchCollege', '<=', q + '\uf8ff'),
          ])
        );
      }

      // --- Batch Queries ---
      if (category === 'all' || category === 'batch') {
        queryPromises.push(safeQuery([where('batchId', '==', upperQ)]));
        queryPromises.push(safeQuery([where('batch', '==', rawQuery)]));
        queryPromises.push(safeQuery([where('searchBatchId', '==', q)]));
      }

      // Execute all parallel lookups simultaneously
      const resultsArray = await Promise.all(queryPromises);
      for (const docs of resultsArray) {
        addDocsToMap(docs);
      }

      // If no results matched and query has multiple words or special format (e.g. name like "Ravi Kumar"
      // whose document might not have been backfilled with searchName yet):
      if (studentsMap.size === 0) {
        // Query by capital letters or first name prefix
        const words = rawQuery.split(/\s+/).filter(Boolean);
        if (words.length > 0) {
          const capitalizedFirst = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
          const fallbackDocs = await safeQuery([
            where('name', '>=', capitalizedFirst),
            where('name', '<=', capitalizedFirst + '\uf8ff'),
          ]);
          addDocsToMap(fallbackDocs);
        }
      }
    }

    // Convert map to array
    let allMatches = Array.from(studentsMap.values());

    // -------------------------------------------------------------
    // Apply Active Secondary Dropdown Filters
    // -------------------------------------------------------------
    if (filters.collegeId && filters.collegeId !== 'all') {
      allMatches = allMatches.filter(
        (s) =>
          s.collegeId === filters.collegeId ||
          s.college?.toLowerCase() === filters.collegeId.toLowerCase()
      );
    }

    if (filters.courseId && filters.courseId !== 'all') {
      allMatches = allMatches.filter(
        (s) =>
          s.courseId === filters.courseId ||
          s.course?.toLowerCase() === filters.courseId.toLowerCase()
      );
    }

    if (filters.batchId && filters.batchId !== 'all') {
      allMatches = allMatches.filter((s) => s.batchId === filters.batchId);
    }

    if (filters.status && filters.status !== 'all') {
      allMatches = allMatches.filter((s) => {
        const studentStatus = (s.status || '').toLowerCase();
        const filterStatus = filters.status.toLowerCase();
        if (filterStatus === 'suspended') return studentStatus === 'dropped';
        if (filterStatus === 'inactive') return studentStatus === 'dropped' || studentStatus === 'graduated';
        return studentStatus === filterStatus;
      });
    }

    // -------------------------------------------------------------
    // Relevance Scoring & Ranking
    // -------------------------------------------------------------
    if (rawQuery) {
      allMatches.sort((a, b) => {
        const scoreA = getRelevanceScore(a, rawQuery, q, upperQ, digitsQ);
        const scoreB = getRelevanceScore(b, rawQuery, q, upperQ, digitsQ);
        if (scoreB !== scoreA) return scoreB - scoreA;
        // Secondary sort by student ID
        return (a.studentId || '').localeCompare(b.studentId || '');
      });
    } else {
      // Default sort by studentId asc or name
      allMatches.sort((a, b) => (a.studentId || '').localeCompare(b.studentId || ''));
    }

    const totalCount = allMatches.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pagedStudents = allMatches.slice(startIndex, startIndex + pageSize);

    return {
      students: pagedStudents,
      totalCount,
      page: safePage,
      pageSize,
      totalPages,
      hasMore: safePage < totalPages,
    };
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.LIST, 'students');
    return {
      students: [],
      totalCount: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      hasMore: false,
    };
  }
}

/**
 * Calculates a match relevance score to prioritize exact identifiers
 */
function getRelevanceScore(
  student: Student,
  rawQuery: string,
  q: string,
  upperQ: string,
  digitsQ: string
): number {
  let score = 0;
  const sId = (student.studentId || '').toUpperCase();
  const tempId = (student.tempStudentId || '').toUpperCase();
  const ht = (student.hallTicketNumber || '').toUpperCase();
  const email = (student.email || '').toLowerCase();
  const name = (student.name || '').toLowerCase();
  const phone = normalizePhoneDigits(student.phone || '');

  // Exact Permanent Codeneksa ID -> Highest priority
  if (sId === upperQ) score += 1000;
  else if (sId.startsWith(upperQ)) score += 500;

  // Exact Temporary Reference ID
  if (tempId === upperQ) score += 900;
  else if (tempId.startsWith(upperQ)) score += 400;

  // Exact Hall Ticket Number
  if (ht === upperQ) score += 800;
  else if (ht.startsWith(upperQ)) score += 350;

  // Exact Email
  if (email === q) score += 700;
  else if (email.startsWith(q)) score += 300;

  // Exact Student Name
  if (name === q) score += 600;
  else if (name.startsWith(q)) score += 250;
  else if (name.includes(q)) score += 150;

  // Exact Phone
  if (digitsQ && phone === digitsQ) score += 550;

  return score;
}

/**
 * Fetches the latest, fresh student document from Firestore by ID
 */
export async function getStudentById(id: string): Promise<Student | null> {
  try {
    const snap = await getDoc(doc(db, 'students', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Student;
  } catch (error) {
    console.error(`Failed to fetch student with ID ${id}:`, error);
    return null;
  }
}

/**
 * Audit log: Records search activity without exposing sensitive student contact data
 */
export async function logStudentSearchAudit(
  category: string,
  resultCount: number
): Promise<void> {
  try {
    await recordActivity({
      actionType: 'STUDENT_SEARCH_PERFORMED' as ActivityActionType,
      description: `Student search executed (category: "${category}"), returning ${resultCount} matching record(s).`,
      category: 'student',
    });
  } catch (err) {
    console.warn('Audit log for search skipped:', err);
  }
}

/**
 * Audit log: Records student 360° profile inspection
 */
export async function logStudentProfileViewed(
  studentIdentifier: string,
  studentName: string
): Promise<void> {
  try {
    await recordActivity({
      actionType: 'STUDENT_PROFILE_VIEWED' as ActivityActionType,
      description: `Operator viewed 360° Profile for student ${studentIdentifier} (${studentName}).`,
      category: 'student',
    });
  } catch (err) {
    console.warn('Audit log for profile view skipped:', err);
  }
}
