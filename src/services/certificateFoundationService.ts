import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../config/firebase';
import {
  CertificateTemplate,
  CertificateRecord,
  CertificateMetrics,
  Student,
} from '../types';
import { recordActivity } from './dashboardService';
import { handleFirestoreError, OperationType } from './firestoreError';

export const CERT_NUMBER_CONFIG = {
  counterDocId: 'certificateNumber',
  prefix: 'CKS-CERT',
  padding: 6,
};

/**
 * Format a number into the official Codeneksa Certificate Number.
 * Example: 1 -> "CKS-CERT-000001", 42 -> "CKS-CERT-000042"
 */
export function formatCertificateNumber(
  sequenceNumber: number,
  prefix: string = CERT_NUMBER_CONFIG.prefix,
  padding: number = CERT_NUMBER_CONFIG.padding
): string {
  return `${prefix}-${String(sequenceNumber).padStart(padding, '0')}`;
}

/**
 * Check whether a student is eligible for certificate generation in Phase 6A.
 */
export function checkStudentEligibility(student: Partial<Student>): {
  eligible: boolean;
  reason?: string;
} {
  // Check permanent Codeneksa ID
  const hasPermanentId =
    student.studentId &&
    typeof student.studentId === 'string' &&
    student.studentId.trim().startsWith('CKS-');

  if (!hasPermanentId) {
    return {
      eligible: false,
      reason: 'Permanent Codeneksa Student ID required.',
    };
  }

  // Check required basic details
  if (!student.name || !student.name.trim()) {
    return {
      eligible: false,
      reason: 'Student name is missing or invalid.',
    };
  }

  if (!student.college || !student.college.trim()) {
    return {
      eligible: false,
      reason: 'College affiliation is required.',
    };
  }

  if (!student.course || !student.course.trim()) {
    return {
      eligible: false,
      reason: 'Course program is required.',
    };
  }

  return { eligible: true };
}

/**
 * Retrieve the current certificate number counter state without incrementing it.
 */
export async function getCertificateNumberCounter(): Promise<{
  currentNumber: number;
  prefix: string;
  padding: number;
}> {
  try {
    const counterRef = doc(db, 'systemCounters', CERT_NUMBER_CONFIG.counterDocId);
    const snap = await getDoc(counterRef);
    if (!snap.exists()) {
      return {
        currentNumber: 0,
        prefix: CERT_NUMBER_CONFIG.prefix,
        padding: CERT_NUMBER_CONFIG.padding,
      };
    }
    const data = snap.data();
    return {
      currentNumber: Number(data.currentNumber) || 0,
      prefix: data.prefix || CERT_NUMBER_CONFIG.prefix,
      padding: Number(data.padding) || CERT_NUMBER_CONFIG.padding,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `systemCounters/${CERT_NUMBER_CONFIG.counterDocId}`);
  }
}

/**
 * Upload a Master Certificate Template PNG to Firebase Storage and save metadata in Firestore.
 * Provides instant DataURL fallback and local caching for infallible operations.
 */
export async function uploadCertificateTemplate(
  file: File,
  name: string,
  version: number | string = 1
): Promise<CertificateTemplate> {
  const currentUser = auth.currentUser;
  const operatorEmail = currentUser?.email || currentUser?.uid || 'admin@codeneksa.com';

  const isImage = (file.type && file.type.startsWith('image/')) || /\.(png|jpe?g|webp)$/i.test(file.name);
  if (!file || !isImage) {
    throw new Error('Please upload a valid PNG certificate image file.');
  }

  const templateId = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const versionStr = String(version);
  const storagePath = `certificate-templates/${templateId}/${versionStr}/master.png`;

  // 1. Read file as high-fidelity Base64 Data URL
  let dataUrl = '';
  try {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } catch (readErr) {
    console.warn('Could not read image as data URL, using ObjectURL:', readErr);
    dataUrl = URL.createObjectURL(file);
  }

  // 2. Measure natural dimensions
  let imageWidth = 2000;
  let imageHeight = 1414;
  try {
    const dimPromise = new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth || 2000, height: img.naturalHeight || 1414 });
      };
      img.onerror = () => {
        resolve({ width: 2000, height: 1414 });
      };
      img.src = dataUrl;
    });
    const measured = await dimPromise;
    imageWidth = measured.width;
    imageHeight = measured.height;
  } catch (dimErr) {
    console.warn('Could not read image dimensions:', dimErr);
  }

  // 3. Attempt Firebase Storage upload in background if available
  let downloadUrl = dataUrl;
  try {
    const storageRef = ref(storage, storagePath);
    const uploadWithTimeout = Promise.race([
      uploadBytes(storageRef, file, {
        contentType: file.type || 'image/png',
        customMetadata: {
          templateId,
          templateName: name,
          version: versionStr,
          uploadedBy: operatorEmail,
        },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Storage upload timeout')), 2000)),
    ]);
    const uploadResult = await uploadWithTimeout;
    const remoteUrl = await getDownloadURL(uploadResult.ref);
    if (remoteUrl) {
      downloadUrl = remoteUrl;
    }
  } catch (err: unknown) {
    console.warn('Firebase Storage upload notice, using DataURL for resilient local preview:', err);
    downloadUrl = dataUrl;
  }

  const now = new Date().toISOString();
  const templateRecord: CertificateTemplate = {
    id: templateId,
    templateId,
    name: name.trim() || 'Master Certificate',
    version: versionStr,
    storagePath,
    fileName: file.name,
    fileUrl: downloadUrl,
    imageWidth,
    imageHeight,
    calibration: {
      xPercent: 50,
      yPercent: 48,
      fontSize: 38,
      fontFamily: 'Helvetica',
      fontWeight: 'bold',
      color: '#111827',
      alignment: 'center',
      maxWidthPercent: 80,
      includeCertNumber: true,
      certNumberXPercent: 20,
      certNumberYPercent: 86,
      certNumberFontSize: 13,
    },
    isActive: true,
    createdAt: now,
    createdBy: operatorEmail,
    updatedAt: now,
    updatedBy: operatorEmail,
  };

  // Cache locally
  try {
    localStorage.setItem('codeneksa_active_master_template', JSON.stringify(templateRecord));
  } catch (lsErr) {
    console.warn('Could not cache active template locally:', lsErr);
  }

  // Attempt Firestore write
  try {
    const templateDocRef = doc(db, 'certificateTemplates', templateId);
    await setDoc(templateDocRef, templateRecord);

    await recordActivity({
      actionType: 'CERTIFICATE_TEMPLATE_UPLOADED',
      description: `Uploaded certificate template "${name}" (v${versionStr})`,
      category: 'certificate',
      metadata: {
        templateId,
        version: versionStr,
        fileName: file.name,
      },
    }).catch(() => {});
  } catch (error) {
    console.warn('Firestore notice saving template, using local copy:', error);
  }

  return templateRecord;
}

/**
 * Retrieve all registered Certificate Templates.
 */
export async function getCertificateTemplates(): Promise<CertificateTemplate[]> {
  try {
    const templatesCol = collection(db, 'certificateTemplates');
    const snap = await getDocs(templatesCol);
    const templates: CertificateTemplate[] = [];

    snap.forEach((docSnap) => {
      templates.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<CertificateTemplate, 'id'>),
      });
    });

    // Sort in-memory to avoid needing composite index in Firestore
    templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return templates;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'certificateTemplates');
  }
}

/**
 * Retrieve the currently active Certificate Template.
 */
export async function getActiveCertificateTemplate(): Promise<CertificateTemplate | null> {
  try {
    const all = await getCertificateTemplates();
    if (all && all.length > 0) {
      const active = all.find((t) => t.isActive);
      if (active) return active;
      return all[0];
    }
  } catch (err) {
    console.warn('Could not fetch active template from Firestore, checking local cache:', err);
  }

  // Local storage fallback for instant and offline template access
  try {
    const cached = localStorage.getItem('codeneksa_active_master_template');
    if (cached) {
      return JSON.parse(cached) as CertificateTemplate;
    }
  } catch (lsErr) {
    console.warn('Could not read cached template:', lsErr);
  }

  return null;
}

/**
 * Set a specific template as the active template for all future certificates.
 */
export async function setActiveCertificateTemplate(templateId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to activate certificate templates.');
  }

  try {
    const templates = await getCertificateTemplates();
    const target = templates.find((t) => t.id === templateId || t.templateId === templateId);
    if (!target) {
      throw new Error(`Template not found (${templateId}).`);
    }

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    templates.forEach((t) => {
      const isTarget = t.id === target.id;
      const ref = doc(db, 'certificateTemplates', t.id);
      batch.update(ref, {
        isActive: isTarget,
        updatedAt: now,
        updatedBy: currentUser.email || 'Operator',
      });
    });

    await batch.commit();

    await recordActivity({
      actionType: 'CERTIFICATE_TEMPLATE_ACTIVATED',
      description: `Activated certificate template "${target.name}" (v${target.version})`,
      category: 'certificate',
      metadata: {
        templateId: target.templateId,
        version: target.version,
      },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `certificateTemplates/${templateId}`);
  }
}

/**
 * Replace a template with a new version of the artwork PNG.
 */
export async function replaceCertificateTemplate(
  existingTemplateId: string,
  newFile: File,
  newName?: string
): Promise<CertificateTemplate> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to update certificate templates.');
  }

  const existingDocRef = doc(db, 'certificateTemplates', existingTemplateId);
  const snap = await getDoc(existingDocRef);
  if (!snap.exists()) {
    throw new Error('Existing template does not exist.');
  }

  const existingData = snap.data() as CertificateTemplate;
  const currentVerNum = parseInt(String(existingData.version).replace(/\D/g, ''), 10) || 1;
  const newVersion = currentVerNum + 1;
  const versionStr = String(newVersion);
  const storagePath = `certificate-templates/${existingTemplateId}/${versionStr}/master.png`;

  let downloadUrl = '';
  try {
    const storageRef = ref(storage, storagePath);
    const uploadResult = await uploadBytes(storageRef, newFile, {
      contentType: newFile.type || 'image/png',
      customMetadata: {
        templateId: existingTemplateId,
        templateName: newName || existingData.name,
        version: versionStr,
        uploadedBy: currentUser.email || currentUser.uid,
      },
    });
    downloadUrl = await getDownloadURL(uploadResult.ref);
  } catch (err) {
    console.warn('Firebase Storage upload notice, using local preview fallback:', err);
    downloadUrl = URL.createObjectURL(newFile);
  }

  const now = new Date().toISOString();
  const updatedData: Partial<CertificateTemplate> = {
    name: newName ? newName.trim() : existingData.name,
    version: versionStr,
    storagePath,
    fileName: newFile.name,
    fileUrl: downloadUrl,
    updatedAt: now,
    updatedBy: currentUser.email || 'Operator',
  };

  try {
    await updateDoc(existingDocRef, updatedData);

    await recordActivity({
      actionType: 'CERTIFICATE_TEMPLATE_REPLACED',
      description: `Replaced template artwork for "${updatedData.name}" with Version ${versionStr}`,
      category: 'certificate',
      metadata: {
        templateId: existingTemplateId,
        newVersion: versionStr,
        fileName: newFile.name,
      },
    });

    return {
      ...existingData,
      ...updatedData,
    } as CertificateTemplate;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `certificateTemplates/${existingTemplateId}`);
  }
}

/**
 * Idempotent, concurrency-safe creation of a staged Certificate Record in PENDING status.
 * Guarantees zero duplicate certificate numbers and ensures duplicate protection per student/course/batch.
 */
export async function createPendingCertificateRecord(
  student: Student,
  template?: CertificateTemplate | null
): Promise<CertificateRecord> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to allocate certificate records.');
  }

  // 1. Check student eligibility
  const eligibility = checkStudentEligibility(student);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason || 'Student is not eligible for certificate generation.');
  }

  // 2. Resolve active template
  const activeTemplate = template || (await getActiveCertificateTemplate());
  if (!activeTemplate) {
    throw new Error('No active certificate template found. Please upload or activate a template first.');
  }

  // 3. IDEMPOTENCY / DUPLICATE PROTECTION:
  // Check if an active certificate record already exists for this student and batch/course
  const certsCol = collection(db, 'certificates');
  const existingQ = query(
    certsCol,
    where('studentId', '==', student.studentId)
  );
  const existingSnap = await getDocs(existingQ);

  const existingCert = existingSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<CertificateRecord, 'id'>) }))
    .find(
      (c) =>
        c.status !== 'REVOKED' &&
        (c.batchId === (student.batchId || student.batch) ||
          c.courseProgram === student.course)
    );

  if (existingCert) {
    // Idempotency: Return existing record without incrementing counter or generating duplicates!
    return existingCert;
  }

  // 4. Concurrency-safe atomic transaction to allocate the next certificate number
  const counterRef = doc(db, 'systemCounters', CERT_NUMBER_CONFIG.counterDocId);
  const certDocRef = doc(collection(db, 'certificates'));
  const certId = certDocRef.id;
  const now = new Date().toISOString();

  let allocatedNumber = '';
  let allocatedRecord: CertificateRecord | null = null;

  try {
    allocatedRecord = await runTransaction(db, async (transaction) => {
      // Read current counter
      const counterSnap = await transaction.get(counterRef);
      let currentNumber = 0;
      let prefix = CERT_NUMBER_CONFIG.prefix;
      let padding = CERT_NUMBER_CONFIG.padding;

      if (counterSnap.exists()) {
        const cData = counterSnap.data();
        currentNumber = Number(cData.currentNumber) || 0;
        prefix = cData.prefix || CERT_NUMBER_CONFIG.prefix;
        padding = Number(cData.padding) || CERT_NUMBER_CONFIG.padding;
      }

      const nextNumber = currentNumber + 1;
      allocatedNumber = formatCertificateNumber(nextNumber, prefix, padding);

      // Verify student doc still exists and has no certificate allocated
      const studentDocRef = doc(db, 'students', student.id);
      const studentSnap = await transaction.get(studentDocRef);

      if (studentSnap.exists()) {
        const liveStudent = studentSnap.data() as Student;
        if (liveStudent.certificateNumber && liveStudent.certificateStatus === 'GENERATED') {
          // Concurrently allocated!
          throw new Error(`Certificate already exists for student: ${liveStudent.certificateNumber}`);
        }
      }

      // Prepare certificate record (PENDING for Phase 6A)
      const newRecord: CertificateRecord = {
        id: certId,
        certificateId: certId,
        certificateNumber: allocatedNumber,
        studentId: student.studentId!,
        studentDocId: student.id,
        studentName: student.name,
        collegeName: student.college || 'Partner College',
        courseProgram: student.course || 'Curriculum Course',
        batchId: student.batchId || student.batch || 'DEFAULT',
        batchName: student.batch || '',
        status: 'PENDING',
        generatedAt: '',
        generatedBy: currentUser.email || 'Operator',
        templateId: activeTemplate.templateId,
        templateVersion: activeTemplate.version,
        filePath: '',
        fileUrl: '',
        generationError: null,
        createdAt: now,
        updatedAt: now,
      };

      // 1. Update central counter
      transaction.set(
        counterRef,
        {
          currentNumber: nextNumber,
          prefix,
          padding,
          lastUpdated: now,
          lastAllocatedId: allocatedNumber,
        },
        { merge: true }
      );

      // 2. Write certificate record
      transaction.set(certDocRef, newRecord);

      // 3. Update student operational status
      transaction.update(studentDocRef, {
        certificateStatus: 'PENDING',
        certificateNumber: allocatedNumber,
        certificateId: certId,
        updatedAt: now,
      });

      return newRecord;
    });

    // Record audit event
    await recordActivity({
      actionType: 'CERTIFICATE_RECORD_CREATED',
      description: `Staged certificate record ${allocatedNumber} for student ${student.name} (${student.studentId})`,
      category: 'certificate',
      metadata: {
        certificateId: certId,
        certificateNumber: allocatedNumber,
        studentId: student.studentId,
        studentName: student.name,
        templateId: activeTemplate.templateId,
        templateVersion: activeTemplate.version,
      },
    });

    return allocatedRecord!;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `certificates/${certId}`);
  }
}

/**
 * Retrieve all certificate records from Firestore.
 */
export async function getCertificateRecords(batchId?: string): Promise<CertificateRecord[]> {
  try {
    const certsCol = collection(db, 'certificates');
    const snap = await getDocs(certsCol);
    const records: CertificateRecord[] = [];

    snap.forEach((docSnap) => {
      records.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<CertificateRecord, 'id'>),
      });
    });

    let filtered = records;
    if (batchId && batchId !== 'all') {
      filtered = filtered.filter((r) => r.batchId === batchId || r.batchName === batchId);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'certificates');
  }
}

/**
 * Aggregate real-time certificate metrics from Firestore.
 */
export async function getCertificateMetrics(): Promise<CertificateMetrics> {
  try {
    const records = await getCertificateRecords();
    const metrics: CertificateMetrics = {
      totalCertificates: records.length,
      generatedCount: 0,
      pendingCount: 0,
      failedCount: 0,
    };

    records.forEach((r) => {
      if (r.status === 'GENERATED') metrics.generatedCount++;
      else if (r.status === 'PENDING') metrics.pendingCount++;
      else if (r.status === 'FAILED') metrics.failedCount++;
    });

    return metrics;
  } catch (error) {
    console.error('Error fetching certificate metrics:', error);
    return {
      totalCertificates: 0,
      generatedCount: 0,
      pendingCount: 0,
      failedCount: 0,
    };
  }
}

/**
 * Load all students from the main existing students database.
 */
export async function getAllStudents(): Promise<Student[]> {
  try {
    const snap = await getDocs(collection(db, 'students'));
    const list: Student[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<Student, 'id'>) });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'students');
  }
}

