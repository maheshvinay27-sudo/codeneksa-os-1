import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { ActivityLog, ActivityActionType, DashboardMetrics } from '../types';
import { handleFirestoreError, OperationType } from './firestoreError';

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const collections = ['colleges', 'courses'] as const;
  const metrics: DashboardMetrics = {
    totalStudents: 0,
    studentsWithId: 0,
    studentsAwaitingId: 0,
    idAssignmentRate: 0,
    totalColleges: 0,
    totalCourses: 0,
    totalBatches: 0,
    batchesAwaitingId: 0,
    isLoading: false,
  };

  try {
    const [studentsSnap, batchesSnap, collegeCount, courseCount] = await Promise.all([
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'batches')),
      getCountFromServer(collection(db, 'colleges')).catch(async () => {
        const s = await getDocs(collection(db, 'colleges'));
        return { data: () => ({ count: s.size }) };
      }),
      getCountFromServer(collection(db, 'courses')).catch(async () => {
        const s = await getDocs(collection(db, 'courses'));
        return { data: () => ({ count: s.size }) };
      }),
    ]);

    metrics.totalColleges = collegeCount.data().count;
    metrics.totalCourses = courseCount.data().count;
    metrics.totalBatches = batchesSnap.size;
    metrics.totalStudents = studentsSnap.size;

    try {
      const emailSnap = await getCountFromServer(collection(db, 'emailLogs')).catch(async () => {
        const s = await getDocs(collection(db, 'emailLogs'));
        return { data: () => ({ count: s.size }) };
      });
      metrics.totalEmails = emailSnap.data().count;
    } catch {
      metrics.totalEmails = 0;
    }

    let assignedCount = 0;
    const batchStudentAssignedMap = new Map<string, { total: number; assigned: number }>();

    studentsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const hasId =
        data.studentIdStatus === 'ASSIGNED' ||
        (typeof data.studentId === 'string' && data.studentId.startsWith('CKS-'));
      if (hasId) {
        assignedCount++;
      }

      const bId = data.batchId || data.batch || 'unknown';
      const existing = batchStudentAssignedMap.get(bId) || { total: 0, assigned: 0 };
      existing.total++;
      if (hasId) existing.assigned++;
      batchStudentAssignedMap.set(bId, existing);
    });

    metrics.studentsWithId = assignedCount;
    metrics.studentsAwaitingId = Math.max(0, metrics.totalStudents - assignedCount);
    metrics.idAssignmentRate =
      metrics.totalStudents > 0 ? Math.round((assignedCount / metrics.totalStudents) * 100) : 0;

    let batchesPending = 0;
    batchesSnap.forEach((bDoc) => {
      const bData = bDoc.data();
      const stats = batchStudentAssignedMap.get(bDoc.id) ||
        batchStudentAssignedMap.get(bData.code) ||
        batchStudentAssignedMap.get(bData.name) || {
          total: bData.studentCount || 0,
          assigned: bData.assignedStudentCount || 0,
        };

      if (stats.total > 0 && stats.assigned < stats.total) {
        batchesPending++;
      } else if (stats.total === 0 && (bData.studentCount || 0) > 0) {
        batchesPending++;
      }
    });

    metrics.batchesAwaitingId = batchesPending;

    return metrics;
  } catch (error) {
    console.error('Failed to fetch metrics', error);
    return metrics;
  }
}

export async function fetchRecentActivities(): Promise<ActivityLog[]> {
  const colPath = 'activityLogs';
  try {
    const q = query(collection(db, colPath), orderBy('timestamp', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ActivityLog, 'id'>),
    }));
  } catch (error) {
    // If empty or failed, gracefully return empty list or capture error
    console.warn('Could not fetch activity logs:', error);
    return [];
  }
}

export async function recordActivity(payload: {
  actionType: ActivityActionType;
  description: string;
  category?: 'student' | 'system' | 'communication' | 'academic' | 'certificate';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const colPath = 'activityLogs';
  const currentUser = auth.currentUser;
  try {
    await addDoc(collection(db, colPath), {
      actionType: payload.actionType,
      description: payload.description,
      performedByUserId: currentUser?.uid || 'system',
      performedByEmail: currentUser?.email || 'admin@codeneksa.com',
      timestamp: new Date().toISOString(),
      category: payload.category || 'system',
      ...(payload.metadata ? { metadata: payload.metadata } : {}),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
  }
}
