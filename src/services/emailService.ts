import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  Student,
  Batch,
  EmailLog,
  EmailTemplate,
  EmailProviderConfig,
  WelcomeMailKPIs,
  WelcomeMailBatchStats,
} from '../types';
import { renderTemplate } from './emailTemplateService';
import { recordActivity } from './dashboardService';
import { handleFirestoreError, OperationType } from './firestoreError';

/**
 * Query the backend for current Email Provider status (resend, sendgrid, postmark, or unconfigured)
 */
export async function checkEmailProviderConfig(): Promise<EmailProviderConfig> {
  try {
    const res = await fetch('/api/email/config');
    if (!res.ok) {
      throw new Error(`Config API returned status ${res.status}`);
    }
    const data = await res.json();
    return {
      configured: Boolean(data.configured),
      provider: data.provider || 'unconfigured',
      fromAddress: data.fromAddress || 'admissions@codeneksa.com',
      fromName: data.fromName || 'Codeneksa Admissions',
      replyTo: data.replyTo || 'support@codeneksa.com',
      testRecipient: data.testRecipient || 'operations-test@codeneksa.com',
    };
  } catch (error) {
    console.warn('Failed to fetch email provider config from backend:', error);
    return {
      configured: false,
      provider: 'unconfigured',
      fromAddress: 'admissions@codeneksa.com',
      fromName: 'Codeneksa Admissions',
      replyTo: 'support@codeneksa.com',
      testRecipient: 'operations-test@codeneksa.com',
    };
  }
}

/**
 * Fetch true operational KPIs across all student records in Firestore
 */
export async function fetchWelcomeMailKPIs(): Promise<WelcomeMailKPIs> {
  try {
    const studentsSnap = await getDocs(collection(db, 'students'));
    let totalStudents = 0;
    let sentCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let notSentCount = 0;

    studentsSnap.forEach((docSnap) => {
      totalStudents++;
      const student = docSnap.data() as Student;
      const status = student.welcomeEmailStatus || 'NOT_SENT';

      if (status === 'SENT') {
        sentCount++;
      } else if (status === 'QUEUED' || status === 'SENDING') {
        pendingCount++;
      } else if (status === 'FAILED') {
        failedCount++;
      } else {
        notSentCount++;
      }
    });

    return {
      totalStudents,
      sentCount,
      pendingCount,
      failedCount,
      notSentCount,
    };
  } catch (error) {
    console.error('Error fetching welcome mail KPIs:', error);
    return {
      totalStudents: 0,
      sentCount: 0,
      pendingCount: 0,
      failedCount: 0,
      notSentCount: 0,
    };
  }
}

/**
 * Fetch batches and compute operational welcome mail statistics for each batch
 */
export async function fetchBatchesWithEmailStats(): Promise<{
  batches: Batch[];
  stats: Record<string, WelcomeMailBatchStats>;
}> {
  try {
    const batchesSnap = await getDocs(collection(db, 'batches'));
    const batches: Batch[] = [];
    batchesSnap.forEach((b) => batches.push({ id: b.id, ...(b.data() as Batch) }));

    const studentsSnap = await getDocs(collection(db, 'students'));
    const stats: Record<string, WelcomeMailBatchStats> = {};

    // Initialize stats for each batch
    batches.forEach((b) => {
      stats[b.batchId || b.id] = {
        batchId: b.batchId || b.id,
        batchName: b.name || b.batchId || b.id,
        collegeName: b.collegeName || b.college || '—',
        courseTitle: b.courseTitle || b.course || '—',
        totalStudents: 0,
        studentsWithEmail: 0,
        studentsWithoutEmail: 0,
        alreadySentCount: 0,
        pendingCount: 0,
        failedCount: 0,
      };
    });

    // Populate stats from actual student records
    studentsSnap.forEach((docSnap) => {
      const s = docSnap.data() as Student;
      const bId = s.batchId || s.batch;
      if (bId && stats[bId]) {
        const item = stats[bId];
        item.totalStudents++;

        const hasEmail = Boolean(s.email && s.email.trim().includes('@'));
        if (hasEmail) {
          item.studentsWithEmail++;
        } else {
          item.studentsWithoutEmail++;
        }

        const emailStatus = s.welcomeEmailStatus || 'NOT_SENT';
        if (emailStatus === 'SENT') {
          item.alreadySentCount++;
        } else if (emailStatus === 'QUEUED' || emailStatus === 'SENDING') {
          item.pendingCount++;
        } else if (emailStatus === 'FAILED') {
          item.failedCount++;
        }
      }
    });

    return { batches, stats };
  } catch (error) {
    console.error('Error fetching batches with email stats:', error);
    return { batches: [], stats: {} };
  }
}

/**
 * Fetch all students belonging to a batch or query with email attributes
 */
export async function fetchStudentsForBatch(batchId: string): Promise<Student[]> {
  try {
    const q = query(collection(db, 'students'), where('batchId', '==', batchId));
    const snap = await getDocs(q);
    const students: Student[] = [];
    snap.forEach((d) => students.push({ id: d.id, ...(d.data() as Student) }));
    return students;
  } catch (error) {
    console.error(`Error fetching students for batch ${batchId}:`, error);
    return [];
  }
}

/**
 * Fetch historical email logs for a specific student
 */
export async function fetchStudentEmailLogs(studentId: string): Promise<EmailLog[]> {
  try {
    const colRef = collection(db, 'emailLogs');
    const q = query(colRef, where('studentId', '==', studentId));
    const snap = await getDocs(q);
    const logs: EmailLog[] = [];
    snap.forEach((d) => logs.push({ id: d.id, ...(d.data() as EmailLog) }));
    // Sort client-side by createdAt descending
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error(`Error fetching email logs for student ${studentId}:`, error);
    return [];
  }
}

/**
 * Fetch all recent email logs across the entire platform
 */
export async function fetchAllEmailLogs(limitCount = 100): Promise<EmailLog[]> {
  try {
    const colRef = collection(db, 'emailLogs');
    const q = query(colRef, limit(limitCount));
    const snap = await getDocs(q);
    const logs: EmailLog[] = [];
    snap.forEach((d) => logs.push({ id: d.id, ...(d.data() as EmailLog) }));
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching all email logs:', error);
    return [];
  }
}

export interface SendWelcomeEmailResult {
  success: boolean;
  studentId: string;
  recipientEmail: string;
  providerMessageId?: string;
  error?: string;
  errorCode?: string;
  isTest?: boolean;
}

/**
 * Send a welcome email to an individual student with idempotency protection and audit logging.
 */
export async function sendIndividualWelcomeEmail(params: {
  student: Student;
  template: EmailTemplate;
  isTest?: boolean;
  testRecipient?: string;
  forceResend?: boolean;
}): Promise<SendWelcomeEmailResult> {
  const { student, template, isTest, testRecipient, forceResend } = params;

  // 1. Validation
  const hasValidEmail = Boolean(student.email && student.email.trim().includes('@'));
  if (!isTest && !hasValidEmail) {
    throw new Error(`Student ${student.name} does not have a valid email address.`);
  }

  // 2. Duplicate Protection (Section 15)
  if (!isTest && student.welcomeEmailStatus === 'SENT' && !forceResend) {
    throw new Error(
      `Duplicate send blocked: Student ${student.name} (${student.studentId || student.id}) already received a welcome email. Explicit confirmation is required to resend.`
    );
  }

  const currentUser = auth.currentUser;
  const operatorEmail = currentUser?.email || 'operator@codeneksa.com';
  const now = new Date().toISOString();

  // 3. Render template
  const rendered = renderTemplate(template, student);
  const effectiveRecipient = isTest
    ? testRecipient || 'operations-test@codeneksa.com'
    : student.email;

  const idempotencyKey = `${student.studentId || student.id}_welcome_${template.id}_${Date.now()}`;
  const logDocId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // 4. Record INITIAL Log (Queued / Sending)
  const initialLog: EmailLog = {
    id: logDocId,
    emailLogId: logDocId,
    studentId: student.studentId || student.id,
    studentDocId: student.id,
    batchId: student.batchId || student.batch,
    recipientEmail: effectiveRecipient,
    recipientName: student.name,
    emailType: 'WELCOME_EMAIL',
    templateId: template.id,
    subject: rendered.subject,
    status: 'SENDING',
    retryCount: student.welcomeEmailRetryCount || 0,
    idempotencyKey,
    createdAt: now,
    queuedAt: now,
    createdBy: operatorEmail,
    isTest: Boolean(isTest),
  };

  try {
    await setDoc(doc(db, 'emailLogs', logDocId), initialLog);
  } catch (logErr) {
    console.warn('Could not write initial email log to Firestore:', logErr);
  }

  // 5. Dispatch to backend API
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: student.studentId || student.id,
        studentDocId: student.id,
        recipientEmail: student.email,
        recipientName: student.name,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.body,
        batchId: student.batchId || student.batch,
        templateId: template.id,
        isTest: Boolean(isTest),
        testRecipient,
        idempotencyKey,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      const errorMsg = data.error || `Email delivery failed with status ${response.status}`;
      const errorCode = data.errorCode || 'DISPATCH_ERROR';

      // Update log to FAILED
      await updateDoc(doc(db, 'emailLogs', logDocId), {
        status: 'FAILED',
        failedAt: new Date().toISOString(),
        errorMessage: errorMsg,
        errorCode,
      }).catch(() => {});

      // If NOT a test, update student record with failure details
      if (!isTest && student.id) {
        const studentRef = doc(db, 'students', student.id);
        const retryCount = (student.welcomeEmailRetryCount || 0) + 1;
        await updateDoc(studentRef, {
          welcomeEmailStatus: 'FAILED',
          welcomeEmailLastAttemptAt: new Date().toISOString(),
          welcomeEmailRetryCount: retryCount,
          welcomeEmailError: errorMsg,
          updatedAt: new Date().toISOString(),
        }).catch((err) => console.error('Failed to update student email failure:', err));
      }

      await recordActivity({
        actionType: 'WELCOME_EMAIL_FAILED' as any,
        description: `Failed to send welcome email to ${isTest ? 'test address ' + effectiveRecipient : student.name}: ${errorMsg}`,
        category: 'communication',
      });

      return {
        success: false,
        studentId: student.studentId || student.id,
        recipientEmail: effectiveRecipient,
        error: errorMsg,
        errorCode,
        isTest,
      };
    }

    // 6. SUCCESS
    const providerMessageId = data.providerMessageId || `msg_${Date.now()}`;
    const sentAt = data.sentAt || new Date().toISOString();

    // Update log to SENT
    await updateDoc(doc(db, 'emailLogs', logDocId), {
      status: 'SENT',
      sentAt,
      providerMessageId,
    }).catch(() => {});

    // If NOT a test, update Student Master Record
    if (!isTest && student.id) {
      const studentRef = doc(db, 'students', student.id);
      await updateDoc(studentRef, {
        welcomeEmailStatus: 'SENT',
        welcomeEmailSentAt: sentAt,
        welcomeEmailLastAttemptAt: sentAt,
        welcomeEmailMessageId: providerMessageId,
        welcomeEmailTemplateId: template.id,
        welcomeEmailError: '',
        updatedAt: sentAt,
      }).catch((err) => console.error('Failed to update student email sent status:', err));
    }

    await recordActivity({
      actionType: 'WELCOME_EMAIL_SENT' as any,
      description: `Welcome email successfully delivered to ${isTest ? '[TEST] ' + effectiveRecipient : student.name + ' (' + (student.studentId || student.id) + ')'}`,
      category: 'communication',
    });

    return {
      success: true,
      studentId: student.studentId || student.id,
      recipientEmail: effectiveRecipient,
      providerMessageId,
      isTest,
    };
  } catch (networkError) {
    const errorMsg =
      networkError instanceof Error ? networkError.message : 'Network error communicating with server';

    await updateDoc(doc(db, 'emailLogs', logDocId), {
      status: 'FAILED',
      failedAt: new Date().toISOString(),
      errorMessage: errorMsg,
      errorCode: 'NETWORK_ERROR',
    }).catch(() => {});

    if (!isTest && student.id) {
      const studentRef = doc(db, 'students', student.id);
      const retryCount = (student.welcomeEmailRetryCount || 0) + 1;
      await updateDoc(studentRef, {
        welcomeEmailStatus: 'FAILED',
        welcomeEmailLastAttemptAt: new Date().toISOString(),
        welcomeEmailRetryCount: retryCount,
        welcomeEmailError: errorMsg,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    return {
      success: false,
      studentId: student.studentId || student.id,
      recipientEmail: effectiveRecipient,
      error: errorMsg,
      errorCode: 'NETWORK_ERROR',
      isTest,
    };
  }
}

/**
 * Execute batch email sending with live progress updates, duplicate protection, and error resilience
 */
export async function executeBatchWelcomeEmails(params: {
  students: Student[];
  template: EmailTemplate;
  skipAlreadySent: boolean;
  onProgress: (progress: {
    completed: number;
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    currentStudentName?: string;
  }) => void;
}): Promise<{
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: SendWelcomeEmailResult[];
}> {
  const { students, template, skipAlreadySent, onProgress } = params;

  await recordActivity({
    actionType: 'WELCOME_EMAIL_BULK_SEND_STARTED' as any,
    description: `Initiated batch welcome email dispatch for ${students.length} students`,
    category: 'communication',
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let completed = 0;
  const results: SendWelcomeEmailResult[] = [];

  for (const student of students) {
    // Check if missing valid email
    if (!student.email || !student.email.trim().includes('@')) {
      skipped++;
      completed++;
      results.push({
        success: false,
        studentId: student.studentId || student.id,
        recipientEmail: student.email || '',
        error: 'Missing valid email address',
        errorCode: 'INVALID_RECIPIENT_EMAIL',
      });
      onProgress({ completed, total: students.length, sent, failed, skipped, currentStudentName: student.name });
      continue;
    }

    // Check duplicate protection
    if (skipAlreadySent && student.welcomeEmailStatus === 'SENT') {
      skipped++;
      completed++;
      results.push({
        success: false,
        studentId: student.studentId || student.id,
        recipientEmail: student.email,
        error: 'Skipped because welcome email was already sent',
        errorCode: 'ALREADY_SENT',
      });
      onProgress({ completed, total: students.length, sent, failed, skipped, currentStudentName: student.name });
      continue;
    }

    onProgress({
      completed,
      total: students.length,
      sent,
      failed,
      skipped,
      currentStudentName: student.name,
    });

    try {
      const res = await sendIndividualWelcomeEmail({
        student,
        template,
        isTest: false,
        forceResend: !skipAlreadySent,
      });

      if (res.success) {
        sent++;
      } else {
        failed++;
      }
      results.push(res);
    } catch (err) {
      failed++;
      results.push({
        success: false,
        studentId: student.studentId || student.id,
        recipientEmail: student.email,
        error: err instanceof Error ? err.message : 'Unknown execution error',
      });
    }

    completed++;
    onProgress({
      completed,
      total: students.length,
      sent,
      failed,
      skipped,
      currentStudentName: student.name,
    });

    // Small delay between requests to preserve backend rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  const finalAction = failed > 0 ? 'WELCOME_EMAIL_BULK_SEND_PARTIAL_FAILURE' : 'WELCOME_EMAIL_BULK_SEND_COMPLETED';
  await recordActivity({
    actionType: finalAction as any,
    description: `Completed bulk email dispatch: ${sent} sent, ${failed} failed, ${skipped} skipped out of ${students.length}`,
    category: 'communication',
  });

  return {
    total: students.length,
    sent,
    failed,
    skipped,
    results,
  };
}

/**
 * Retry sending welcome email for a failed student
 */
export async function retryWelcomeEmail(
  student: Student,
  template: EmailTemplate
): Promise<SendWelcomeEmailResult> {
  await recordActivity({
    actionType: 'WELCOME_EMAIL_RETRIED' as any,
    description: `Retrying welcome email dispatch for student ${student.name} (${student.studentId || student.id})`,
    category: 'communication',
  });

  return sendIndividualWelcomeEmail({
    student,
    template,
    forceResend: true,
  });
}
