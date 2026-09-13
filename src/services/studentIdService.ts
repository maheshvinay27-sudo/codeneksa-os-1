import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  Student,
  Batch,
  SystemCounter,
  StudentIdEmployeeStats,
  IdAssignmentPreviewItem,
  IdAssignmentProgress,
  IdAssignmentResult,
} from '../types';
import { recordActivity } from './dashboardService';
import { handleFirestoreError, OperationType } from './firestoreError';

// Centralized sequence configuration (can be adjusted or driven by database settings)
export const ID_CONFIG = {
  counterDocId: 'studentId',
  prefix: 'CKS',
  padding: 6,
};

/**
 * Format a number into the official permanent Codeneksa Student ID.
 * Example: 1 -> "CKS-000001", 42 -> "CKS-000042"
 */
export function formatCodeneksaId(
  sequenceNumber: number,
  prefix: string = ID_CONFIG.prefix,
  padding: number = ID_CONFIG.padding
): string {
  return `${prefix}-${String(sequenceNumber).padStart(padding, '0')}`;
}

/**
 * Check whether a student already has a valid permanent Codeneksa Student ID assigned.
 */
export function isStudentAssignedPermanentId(student: Partial<Student>): boolean {
  if (student.studentIdStatus === 'ASSIGNED') return true;
  if (student.studentId && student.studentId.startsWith(`${ID_CONFIG.prefix}-`)) return true;
  return false;
}

/**
 * Retrieve the current central sequence counter from Firestore.
 */
export async function getStudentIdCounter(): Promise<SystemCounter> {
  const counterRef = doc(db, 'systemCounters', ID_CONFIG.counterDocId);
  try {
    const snap = await getDoc(counterRef);
    if (!snap.exists()) {
      return {
        id: ID_CONFIG.counterDocId,
        currentNumber: 0,
        prefix: ID_CONFIG.prefix,
        padding: ID_CONFIG.padding,
      };
    }
    const data = snap.data();
    return {
      id: snap.id,
      currentNumber: Number(data.currentNumber) || 0,
      prefix: data.prefix || ID_CONFIG.prefix,
      padding: Number(data.padding) || ID_CONFIG.padding,
      lastUpdated: data.lastUpdated,
      lastBatchId: data.lastBatchId,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `systemCounters/${ID_CONFIG.counterDocId}`);
  }
}

/**
 * Fetch all students belonging to a specific batch.
 */
export async function getStudentsByBatch(batchId: string): Promise<Student[]> {
  try {
    // Check both batchId and code/id matching for robustness across import scenarios
    const q = query(collection(db, 'students'), where('batchId', '==', batchId));
    const snap = await getDocs(q);
    const students: Student[] = [];
    snap.forEach((docSnap) => {
      students.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Student, 'id'>),
      });
    });

    // If no direct batchId matches, try matching by batch name or code
    if (students.length === 0) {
      const qBatch = query(collection(db, 'students'), where('batch', '==', batchId));
      const snap2 = await getDocs(qBatch);
      snap2.forEach((docSnap) => {
        students.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Student, 'id'>),
        });
      });
    }

    return students;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'students');
  }
}

/**
 * Generate a pre-assignment preview of how IDs will be assigned to students in a batch.
 */
export async function generateIdAssignmentPreview(
  batchId: string
): Promise<{
  items: IdAssignmentPreviewItem[];
  totalStudents: number;
  totalAwaiting: number;
  totalAlreadyAssigned: number;
  currentCounterNumber: number;
  startId: string;
  endId: string;
}> {
  const [students, counter] = await Promise.all([
    getStudentsByBatch(batchId),
    getStudentIdCounter(),
  ]);

  let nextSequence = counter.currentNumber;
  let firstAssignedId = '';
  let lastAssignedId = '';
  let awaitingCount = 0;
  let alreadyAssignedCount = 0;

  const items: IdAssignmentPreviewItem[] = [];

  for (const s of students) {
    const isAssigned = isStudentAssignedPermanentId(s);
    if (isAssigned) {
      alreadyAssignedCount++;
      items.push({
        studentDocId: s.id,
        studentName: s.name,
        hallTicketNumber: s.hallTicketNumber,
        currentReferenceId: s.tempStudentId || s.studentId || s.id,
        newCodeneksaId: s.studentId, // Keeps the existing permanent ID!
        alreadyAssigned: true,
      });
    } else {
      awaitingCount++;
      nextSequence += 1;
      const proposedId = formatCodeneksaId(nextSequence, counter.prefix, counter.padding);
      if (!firstAssignedId) firstAssignedId = proposedId;
      lastAssignedId = proposedId;

      items.push({
        studentDocId: s.id,
        studentName: s.name,
        hallTicketNumber: s.hallTicketNumber,
        currentReferenceId: s.tempStudentId || s.studentId || s.id,
        newCodeneksaId: proposedId,
        alreadyAssigned: false,
      });
    }
  }

  return {
    items,
    totalStudents: students.length,
    totalAwaiting: awaitingCount,
    totalAlreadyAssigned: alreadyAssignedCount,
    currentCounterNumber: counter.currentNumber,
    startId: firstAssignedId || (items[0]?.newCodeneksaId ?? '—'),
    endId: lastAssignedId || (items[items.length - 1]?.newCodeneksaId ?? '—'),
  };
}

/**
 * Perform concurrency-safe, idempotent, atomic Codeneksa Student ID assignment for a batch.
 */
export async function assignStudentIdsToBatch(
  batchId: string,
  batchName: string,
  onProgress?: (progress: IdAssignmentProgress) => void
): Promise<IdAssignmentResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to assign permanent student IDs.');
  }

  // Fetch the latest state of students in this batch directly from Firestore
  const allStudents = await getStudentsByBatch(batchId);
  if (allStudents.length === 0) {
    throw new Error(`No student records found in batch "${batchName}" (${batchId}).`);
  }

  // Identify unassigned students
  const unassignedStudents = allStudents.filter((s) => !isStudentAssignedPermanentId(s));
  const alreadyAssignedCount = allStudents.length - unassignedStudents.length;

  // IDEMPOTENCY CHECK: If all students already have permanent IDs, do not touch counter!
  if (unassignedStudents.length === 0) {
    const existingIds = allStudents.map((s) => s.studentId).sort();
    return {
      batchId,
      batchName,
      totalStudents: allStudents.length,
      alreadyAssignedCount: allStudents.length,
      newlyAssignedCount: 0,
      assignedIds: existingIds,
      startId: existingIds[0],
      endId: existingIds[existingIds.length - 1],
      success: true,
    };
  }

  const CHUNK_SIZE = 50; // Keep transaction reads/writes well below Firestore 500 limits
  const totalToAssign = unassignedStudents.length;
  let successfulCount = 0;
  let failedCount = 0;
  const newlyAssignedIds: string[] = [];
  const counterRef = doc(db, 'systemCounters', ID_CONFIG.counterDocId);

  onProgress?.({
    processed: 0,
    total: totalToAssign,
    successful: 0,
    failed: 0,
    remaining: totalToAssign,
    percentage: 5,
    statusMessage: `Verifying central ID sequence in Firestore...`,
  });

  for (let i = 0; i < unassignedStudents.length; i += CHUNK_SIZE) {
    const chunk = unassignedStudents.slice(i, i + CHUNK_SIZE);

    try {
      // Execute atomic transaction for this chunk
      const chunkResult = await runTransaction(db, async (transaction) => {
        // 1. Read central counter inside transaction
        const counterSnap = await transaction.get(counterRef);
        let currentSequence = 0;
        let prefix = ID_CONFIG.prefix;
        let padding = ID_CONFIG.padding;

        if (counterSnap.exists()) {
          const cData = counterSnap.data();
          currentSequence = Number(cData.currentNumber) || 0;
          prefix = cData.prefix || ID_CONFIG.prefix;
          padding = Number(cData.padding) || ID_CONFIG.padding;
        }

        // 2. Read and verify all student docs in this chunk to prevent race condition
        const verifiedPending: { studentRef: any; origDoc: Student; newId: string }[] = [];
        let seqOffset = 0;

        for (const student of chunk) {
          const sRef = doc(db, 'students', student.id);
          const sSnap = await transaction.get(sRef);
          if (sSnap.exists()) {
            const liveData = sSnap.data() as Student;
            // Check live state: if another session already assigned it, skip!
            if (!isStudentAssignedPermanentId(liveData)) {
              seqOffset += 1;
              const assignedId = formatCodeneksaId(currentSequence + seqOffset, prefix, padding);
              verifiedPending.push({
                studentRef: sRef,
                origDoc: liveData,
                newId: assignedId,
              });
            }
          }
        }

        // If all in this chunk were already assigned concurrently, don't increment counter
        if (verifiedPending.length === 0) {
          return { chunkAssignedIds: [], newCurrentNumber: currentSequence };
        }

        const newCurrentNumber = currentSequence + verifiedPending.length;
        const nowIso = new Date().toISOString();

        // 3. Atomically update the central sequence counter
        transaction.set(
          counterRef,
          {
            currentNumber: newCurrentNumber,
            prefix,
            padding,
            lastUpdated: nowIso,
            lastBatchId: batchId,
          },
          { merge: true }
        );

        // 4. Atomically update each verified pending student
        const chunkAssignedIds: string[] = [];
        for (const item of verifiedPending) {
          const tempId = item.origDoc.tempStudentId || item.origDoc.studentId || item.origDoc.id;
          transaction.update(item.studentRef, {
            studentId: item.newId,
            searchStudentId: item.newId.toLowerCase(),
            tempStudentId: tempId, // Preserve original temporary reference ID
            searchTempStudentId: tempId.toLowerCase(),
            studentIdStatus: 'ASSIGNED',
            studentIdAssignedAt: nowIso,
            studentIdAssignedBy: currentUser.uid,
            updatedAt: nowIso,
          });
          chunkAssignedIds.push(item.newId);
        }

        return { chunkAssignedIds, newCurrentNumber };
      });

      successfulCount += chunkResult.chunkAssignedIds.length;
      newlyAssignedIds.push(...chunkResult.chunkAssignedIds);

      const percent = Math.min(
        95,
        10 + Math.round((successfulCount / totalToAssign) * 85)
      );

      onProgress?.({
        processed: successfulCount + failedCount,
        total: totalToAssign,
        successful: successfulCount,
        failed: failedCount,
        remaining: totalToAssign - (successfulCount + failedCount),
        percentage: percent,
        statusMessage: `Assigned permanent IDs: ${successfulCount} of ${totalToAssign}...`,
      });
    } catch (chunkError) {
      console.error(`Transaction failed for chunk starting at index ${i}:`, chunkError);
      failedCount += chunk.length;
      onProgress?.({
        processed: successfulCount + failedCount,
        total: totalToAssign,
        successful: successfulCount,
        failed: failedCount,
        remaining: totalToAssign - (successfulCount + failedCount),
        percentage: Math.min(95, Math.round(((successfulCount + failedCount) / totalToAssign) * 90)),
        statusMessage: `Encountered error on batch chunk: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`,
      });
    }
  }

  // Update batch document with assignment statistics
  try {
    const batchDocRef = doc(db, 'batches', batchId);
    const totalAssignedForBatch = alreadyAssignedCount + successfulCount;
    const isCompleted = totalAssignedForBatch >= allStudents.length;

    await updateDoc(batchDocRef, {
      idAssignmentStatus: isCompleted ? 'COMPLETED' : 'PARTIAL',
      assignedStudentCount: totalAssignedForBatch,
      pendingStudentCount: Math.max(0, allStudents.length - totalAssignedForBatch),
      updatedAt: new Date().toISOString(),
    });
  } catch (batchErr) {
    console.warn('Could not update batch assignment status doc:', batchErr);
  }

  // Create audit activity log if any new IDs were assigned
  if (successfulCount > 0) {
    const startId = newlyAssignedIds[0];
    const endId = newlyAssignedIds[newlyAssignedIds.length - 1];
    const rangeDesc = startId === endId ? startId : `${startId} → ${endId}`;

    await recordActivity({
      actionType: 'STUDENT_IDS_ASSIGNED',
      description: `${successfulCount} permanent Codeneksa Student IDs assigned to ${batchName} (${batchId}). Range: ${rangeDesc}`,
      category: 'student',
    });
  }

  onProgress?.({
    processed: totalToAssign,
    total: totalToAssign,
    successful: successfulCount,
    failed: failedCount,
    remaining: 0,
    percentage: 100,
    statusMessage: `Completed: ${successfulCount} IDs successfully allocated.`,
  });

  return {
    batchId,
    batchName,
    totalStudents: allStudents.length,
    alreadyAssignedCount,
    newlyAssignedCount: successfulCount,
    assignedIds: newlyAssignedIds,
    startId: newlyAssignedIds[0],
    endId: newlyAssignedIds[newlyAssignedIds.length - 1],
    success: failedCount === 0,
    error: failedCount > 0 ? `Failed to assign ${failedCount} students.` : undefined,
  };
}

/**
 * Fetch global Student ID Employee operational statistics and batch statuses.
 */
export async function fetchStudentIdEmployeeOverview(): Promise<{
  stats: StudentIdEmployeeStats;
  batchesWithStats: (Batch & {
    totalStudents: number;
    assignedCount: number;
    pendingCount: number;
    idStatus: 'Awaiting ID Assignment' | 'IDs Assigned' | 'Partially Assigned';
  })[];
}> {
  try {
    const [batchesSnap, studentsSnap] = await Promise.all([
      getDocs(collection(db, 'batches')),
      getDocs(collection(db, 'students')),
    ]);

    const allStudents: Student[] = [];
    studentsSnap.forEach((d) => {
      allStudents.push({ id: d.id, ...(d.data() as Omit<Student, 'id'>) });
    });

    const allBatches: Batch[] = [];
    batchesSnap.forEach((d) => {
      allBatches.push({ id: d.id, ...(d.data() as Omit<Batch, 'id'>) });
    });

    // Map students by batch ID
    const batchStudentMap = new Map<string, Student[]>();
    let totalAssignedStudents = 0;

    for (const student of allStudents) {
      const assigned = isStudentAssignedPermanentId(student);
      if (assigned) totalAssignedStudents++;

      const bKey = student.batchId || student.batch || 'unassigned';
      const existing = batchStudentMap.get(bKey) || [];
      existing.push(student);
      batchStudentMap.set(bKey, existing);
    }

    let batchesAwaitingCount = 0;

    const batchesWithStats = allBatches.map((b) => {
      const bKey = b.id || b.batchId || b.code;
      // Match students either by id or code
      const batchStudents =
        batchStudentMap.get(b.id) ||
        batchStudentMap.get(b.batchId || '') ||
        batchStudentMap.get(b.name) ||
        [];

      let assignedInBatch = 0;
      for (const s of batchStudents) {
        if (isStudentAssignedPermanentId(s)) assignedInBatch++;
      }

      const totalInBatch = batchStudents.length || b.studentCount || 0;
      const pendingInBatch = Math.max(0, totalInBatch - assignedInBatch);

      let idStatus: 'Awaiting ID Assignment' | 'IDs Assigned' | 'Partially Assigned' =
        'Awaiting ID Assignment';

      if (totalInBatch > 0 && assignedInBatch === totalInBatch) {
        idStatus = 'IDs Assigned';
      } else if (assignedInBatch > 0 && pendingInBatch > 0) {
        idStatus = 'Partially Assigned';
        batchesAwaitingCount++;
      } else if (pendingInBatch > 0) {
        idStatus = 'Awaiting ID Assignment';
        batchesAwaitingCount++;
      }

      return {
        ...b,
        totalStudents: totalInBatch,
        assignedCount: assignedInBatch,
        pendingCount: pendingInBatch,
        idStatus,
      };
    });

    const totalStudents = allStudents.length;
    const studentsAwaitingId = Math.max(0, totalStudents - totalAssignedStudents);

    return {
      stats: {
        totalStudents,
        studentsAwaitingId,
        studentsAssignedId: totalAssignedStudents,
        batchesAwaitingId: batchesAwaitingCount,
        totalBatches: allBatches.length,
      },
      batchesWithStats,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'students/batches');
  }
}
