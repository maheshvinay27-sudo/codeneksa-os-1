import { collection, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const ADMIN_RESET_PASSCODE = '9182029334';

export interface DatabaseResetProgress {
  step: string;
  currentStepIndex: number;
  totalSteps: number;
  deletedCounts: Record<string, number>;
}

export function verifyResetPasscode(enteredPasscode: string): boolean {
  return enteredPasscode.trim() === ADMIN_RESET_PASSCODE;
}

/**
 * Deletes all documents in a given Firestore collection in batches of 400.
 */
async function clearCollection(
  collectionName: string,
  onDocCount?: (count: number) => void
): Promise<number> {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    const docs = snap.docs;
    const total = docs.length;

    if (total === 0) {
      onDocCount?.(0);
      return 0;
    }

    // Commit deletes in batches of 400
    const BATCH_SIZE = 400;
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + BATCH_SIZE);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    onDocCount?.(total);
    return total;
  } catch (err) {
    console.warn(`Error clearing collection ${collectionName}:`, err);
    return 0;
  }
}

/**
 * Resets all database data in Firestore across all operational collections.
 * Strictly gated by passcode: 9182029334.
 */
export async function resetAllDatabaseData({
  passcode,
  operatorEmail,
  operatorUid,
  onProgress,
}: {
  passcode: string;
  operatorEmail: string;
  operatorUid: string;
  onProgress?: (progress: DatabaseResetProgress) => void;
}): Promise<{ success: boolean; deletedCounts: Record<string, number> }> {
  if (!verifyResetPasscode(passcode)) {
    throw new Error('Access Denied: Invalid administrator passcode.');
  }

  const collectionsToClear = [
    'students',
    'batches',
    'certificates',
    'certificateTemplates',
    'colleges',
    'courses',
    'emailLogs',
    'emailTemplates',
    'activityLogs',
    'settings',
  ];

  const totalSteps = collectionsToClear.length + 2; // +1 for sequence counters, +1 for audit trail & local cache
  const deletedCounts: Record<string, number> = {};

  for (let i = 0; i < collectionsToClear.length; i++) {
    const col = collectionsToClear[i];
    onProgress?.({
      step: `Erasing ${col} records...`,
      currentStepIndex: i + 1,
      totalSteps,
      deletedCounts,
    });

    const count = await clearCollection(col);
    deletedCounts[col] = count;
  }

  // Reset System Counters to 0 so fresh batches start cleanly from 1
  onProgress?.({
    step: 'Resetting system sequence counters and numbering generators...',
    currentStepIndex: totalSteps - 1,
    totalSteps,
    deletedCounts,
  });

  try {
    const now = new Date().toISOString();
    await setDoc(
      doc(db, 'systemCounters', 'studentIdCounter'),
      {
        id: 'studentIdCounter',
        currentNumber: 0,
        prefix: 'CKS',
        padding: 4,
        lastUpdated: now,
        lastBatchId: null,
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'systemCounters', 'certificateNumber'),
      {
        id: 'certificateNumber',
        currentNumber: 0,
        prefix: 'CKS-CERT',
        padding: 6,
        lastUpdated: now,
      },
      { merge: true }
    );
  } catch (counterErr) {
    console.warn('Could not reset sequence counters:', counterErr);
  }

  // Clear local browser storage caches
  try {
    localStorage.removeItem('codeneksa_active_master_template');
    localStorage.removeItem('codeneksa_email_templates');
    localStorage.removeItem('codeneksa_last_batch');
    sessionStorage.clear();
  } catch (storageErr) {
    console.warn('Could not clear local storage:', storageErr);
  }

  // Create clean initial audit activity log
  onProgress?.({
    step: 'Finalizing clean state and recording audit log...',
    currentStepIndex: totalSteps,
    totalSteps,
    deletedCounts,
  });

  try {
    const logId = `reset-${Date.now()}`;
    await setDoc(doc(db, 'activityLogs', logId), {
      id: logId,
      actionType: 'SYSTEM_DATABASE_RESET',
      description: 'Full OS database reset executed by Administrator with authorized passcode verification.',
      performedByUserId: operatorUid || 'admin',
      performedByEmail: operatorEmail || 'admin@codeneksa.com',
      timestamp: new Date().toISOString(),
      category: 'security',
    });
  } catch (auditErr) {
    console.warn('Could not write audit log for database reset:', auditErr);
  }

  return {
    success: true,
    deletedCounts,
  };
}
