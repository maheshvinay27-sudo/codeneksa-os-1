import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Batch, Student } from '../types';
import { handleFirestoreError, OperationType } from './firestoreError';

export async function fetchAllBatches(): Promise<Batch[]> {
  try {
    const q = query(collection(db, 'batches'), orderBy('createdAt', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Batch, 'id'>),
    }));
  } catch (error) {
    console.warn('Failed to fetch batches from Firestore:', error);
    return [];
  }
}

export const getBatches = fetchAllBatches;
export { fetchCollegesList as getColleges, fetchCoursesList as getCourses } from './dataEmployeeService';

export async function fetchBatchById(batchId: string): Promise<Batch | null> {
  try {
    const docRef = doc(db, 'batches', batchId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Batch, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `batches/${batchId}`);
    return null;
  }
}

export async function fetchStudentsByBatch(batchId: string): Promise<Student[]> {
  try {
    const q = query(
      collection(db, 'students'),
      where('batchId', '==', batchId),
      limit(500)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Student, 'id'>),
    }));
  } catch (error) {
    console.warn(`Could not fetch students for batch ${batchId}:`, error);
    return [];
  }
}

export interface StudentsQueryResult {
  students: Student[];
  lastVisibleDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export async function fetchStudentsList(
  pageSize: number = 20,
  lastVisibleDoc: DocumentSnapshot | null = null,
  batchFilter?: string
): Promise<StudentsQueryResult> {
  try {
    const colRef = collection(db, 'students');
    let q;

    if (batchFilter && batchFilter !== 'all') {
      if (lastVisibleDoc) {
        q = query(
          colRef,
          where('batchId', '==', batchFilter),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisibleDoc),
          limit(pageSize + 1)
        );
      } else {
        q = query(
          colRef,
          where('batchId', '==', batchFilter),
          orderBy('createdAt', 'desc'),
          limit(pageSize + 1)
        );
      }
    } else {
      if (lastVisibleDoc) {
        q = query(
          colRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastVisibleDoc),
          limit(pageSize + 1)
        );
      } else {
        q = query(
          colRef,
          orderBy('createdAt', 'desc'),
          limit(pageSize + 1)
        );
      }
    }

    const snapshot = await getDocs(q);
    const hasMore = snapshot.docs.length > pageSize;
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    const students: Student[] = docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Student, 'id'>),
    }));

    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    return {
      students,
      lastVisibleDoc: lastDoc,
      hasMore,
    };
  } catch (error) {
    console.warn('Failed to query students with pagination:', error);
    return {
      students: [],
      lastVisibleDoc: null,
      hasMore: false,
    };
  }
}
