import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  writeBatch,
  query,
  limit,
  orderBy,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  ColumnMappingConfig,
  ParsedStudentRow,
  ValidationSummary,
  ImportProgress,
  ImportResult,
  College,
  Course,
  Batch,
  Student,
} from '../types';
import { recordActivity } from './dashboardService';
import { handleFirestoreError, OperationType } from './firestoreError';
import { computeSearchFields } from './studentSearchService';

// Column header variations for intelligent auto-detection
const COLUMN_PATTERNS: Record<keyof ColumnMappingConfig, string[]> = {
  name: [
    'name',
    'student name',
    'studentname',
    'fullname',
    'full name',
    'student full name',
    'candidate name',
    'candidate',
    'student_name',
    'applicant name',
    'student',
  ],
  hallTicketNumber: [
    'hall ticket',
    'hall ticket number',
    'hall ticket no',
    'hallticket',
    'hallticketnumber',
    'ht no',
    'ht number',
    'htno',
    'ht_no',
    'roll number',
    'roll no',
    'rollno',
    'reg no',
    'reg number',
    'registration number',
    'registration no',
    'register no',
    'exam reg no',
    'usn',
  ],
  email: [
    'email',
    'email id',
    'emailid',
    'e-mail',
    'student email',
    'student_email',
    'email address',
    'mail id',
    'mail',
    'personal email',
  ],
  phone: [
    'phone',
    'phone number',
    'mobile',
    'mobile number',
    'contact',
    'contact number',
    'cell',
    'cell number',
    'student phone',
    'whatsapp number',
    'contact_no',
    'phone_no',
  ],
  college: [
    'college',
    'college name',
    'institution',
    'institute',
    'college_name',
    'campus',
    'institution name',
    'school',
  ],
  course: [
    'course',
    'program',
    'programme',
    'branch',
    'stream',
    'specialization',
    'department',
    'curriculum',
    'degree',
  ],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FileParseResult {
  fileName: string;
  fileSize: number;
  headers: string[];
  rawRows: Record<string, any>[];
  totalRawRows: number;
}

/**
 * Parses uploaded CSV, XLSX, or XLS file into headers and raw rows
 */
export async function parseStudentDataFile(file: File): Promise<FileParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !['csv', 'xlsx', 'xls'].includes(extension)) {
    throw new Error('Unsupported file format. Please upload a .csv, .xlsx, or .xls file.');
  }

  // Guard against extreme file sizes (> 15MB)
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('File size exceeds the 15MB limit. Please upload a smaller batch file.');
  }

  if (extension === 'csv') {
    return parseCsvFile(file);
  } else {
    return parseExcelFile(file);
  }
}

function parseCsvFile(file: File): Promise<FileParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.errors && results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(`Failed to parse CSV: ${results.errors[0]?.message || 'Malformed file'}`));
          return;
        }

        const rawRows = (results.data as Record<string, any>[]).filter((row) => {
          return Object.values(row).some((val) => val !== null && val !== undefined && String(val).trim() !== '');
        });

        if (rawRows.length === 0) {
          reject(new Error('The uploaded CSV file contains no data rows or is completely empty.'));
          return;
        }

        const headers = results.meta.fields?.filter((f) => f.trim() !== '') || Object.keys(rawRows[0] || {});
        if (headers.length === 0) {
          reject(new Error('Could not detect any column headers in this CSV file.'));
          return;
        }

        resolve({
          fileName: file.name,
          fileSize: file.size,
          headers,
          rawRows,
          totalRawRows: rawRows.length,
        });
      },
      error: (err) => {
        reject(new Error(`CSV Parse Error: ${err.message}`));
      },
    });
  });
}

async function parseExcelFile(file: File): Promise<FileParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('The uploaded Excel workbook has no sheets.');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    if (!worksheet) {
      throw new Error('Could not access the first worksheet in the workbook.');
    }

    // Convert sheet to JSON with raw strings
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: '',
      blankrows: false,
      raw: false,
    });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('The uploaded Excel sheet contains no data rows or is empty.');
    }

    // Filter out rows that are entirely empty
    const validRows = rawRows.filter((row) => {
      return Object.values(row).some((val) => val !== null && val !== undefined && String(val).trim() !== '');
    });

    if (validRows.length === 0) {
      throw new Error('All rows in the Excel file are empty.');
    }

    // Extract headers from first row
    const headers = Object.keys(validRows[0] || {}).map((h) => h.trim()).filter(Boolean);

    return {
      fileName: file.name,
      fileSize: file.size,
      headers,
      rawRows: validRows,
      totalRawRows: validRows.length,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to read Excel file. Please ensure it is not corrupt.');
  }
}

/**
 * Attempts to automatically recognize and map column headers to standard student fields
 */
export function autoDetectColumnMapping(headers: string[]): {
  mapping: ColumnMappingConfig;
  confidence: Record<keyof ColumnMappingConfig, 'high' | 'medium' | 'low' | 'unmapped'>;
  isConfident: boolean;
} {
  const mapping: ColumnMappingConfig = {
    name: '',
    hallTicketNumber: '',
    email: '',
    phone: '',
    college: '',
    course: '',
  };

  const confidence: Record<keyof ColumnMappingConfig, 'high' | 'medium' | 'low' | 'unmapped'> = {
    name: 'unmapped',
    hallTicketNumber: 'unmapped',
    email: 'unmapped',
    phone: 'unmapped',
    college: 'unmapped',
    course: 'unmapped',
  };

  const usedHeaders = new Set<string>();

  // Helper to normalize strings for comparison
  const normalize = (str: string) =>
    str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: normalize(h),
  }));

  const fields: (keyof ColumnMappingConfig)[] = [
    'name',
    'hallTicketNumber',
    'email',
    'phone',
    'college',
    'course',
  ];

  // Pass 1: Look for exact or prioritized matches
  for (const field of fields) {
    const patterns = COLUMN_PATTERNS[field];
    for (const pattern of patterns) {
      const normPattern = normalize(pattern);
      const match = normalizedHeaders.find(
        (h) => !usedHeaders.has(h.original) && h.normalized === normPattern
      );
      if (match) {
        mapping[field] = match.original;
        confidence[field] = 'high';
        usedHeaders.add(match.original);
        break;
      }
    }
  }

  // Pass 2: Look for substring / loose matches for unmapped fields
  for (const field of fields) {
    if (mapping[field]) continue;
    const patterns = COLUMN_PATTERNS[field];
    for (const pattern of patterns) {
      const normPattern = normalize(pattern);
      const match = normalizedHeaders.find(
        (h) =>
          !usedHeaders.has(h.original) &&
          (h.normalized.includes(normPattern) || normPattern.includes(h.normalized))
      );
      if (match) {
        mapping[field] = match.original;
        confidence[field] = 'medium';
        usedHeaders.add(match.original);
        break;
      }
    }
  }

  // High confidence if Name is detected with at least medium/high confidence
  const isConfident = confidence.name === 'high' || confidence.name === 'medium';

  return { mapping, confidence, isConfident };
}

/**
 * Validates, deduplicates, and organizes parsed student rows according to mapping
 */
export function validateStudentData(
  rawRows: Record<string, any>[],
  mapping: ColumnMappingConfig,
  allHeaders: string[]
): {
  rows: ParsedStudentRow[];
  summary: ValidationSummary;
} {
  const rows: ParsedStudentRow[] = [];
  const seenHallTickets = new Map<string, number>(); // HTN -> count
  const seenRowSignatures = new Map<string, number>(); // signature -> count

  // Count unexpected columns (headers not mapped to any target field)
  const mappedHeaderValues = new Set(Object.values(mapping).filter(Boolean));
  const unexpectedColumns = allHeaders.filter((h) => !mappedHeaderValues.has(h));

  let missingNameCount = 0;
  let missingEmailCount = 0;
  let invalidEmailCount = 0;
  let duplicateHallTicketCount = 0;
  let duplicateRowCount = 0;

  // Pass 1: Build rows and tally duplicates
  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const name = mapping.name ? String(raw[mapping.name] ?? '').trim() : '';
    const hallTicketNumber = mapping.hallTicketNumber
      ? String(raw[mapping.hallTicketNumber] ?? '').trim()
      : '';
    const email = mapping.email ? String(raw[mapping.email] ?? '').trim() : '';
    const phone = mapping.phone ? String(raw[mapping.phone] ?? '').trim() : '';
    const college = mapping.college ? String(raw[mapping.college] ?? '').trim() : '';
    const course = mapping.course ? String(raw[mapping.course] ?? '').trim() : '';

    if (hallTicketNumber) {
      const count = seenHallTickets.get(hallTicketNumber.toUpperCase()) || 0;
      seenHallTickets.set(hallTicketNumber.toUpperCase(), count + 1);
    }

    const rowSig = `${name.toLowerCase()}|${hallTicketNumber.toLowerCase()}|${email.toLowerCase()}`;
    const sigCount = seenRowSignatures.get(rowSig) || 0;
    seenRowSignatures.set(rowSig, sigCount + 1);

    rows.push({
      rowIndex: i + 1,
      raw,
      mapped: {
        name,
        hallTicketNumber,
        email,
        phone,
        college,
        course,
      },
      validationStatus: 'valid',
      issues: [],
    });
  }

  // Pass 2: Apply detailed validation rules
  let validCount = 0;
  let attentionCount = 0;
  let invalidCount = 0;

  for (const row of rows) {
    const { name, hallTicketNumber, email } = row.mapped;

    // Rule 1: Student Name is mandatory (Critical Error)
    if (!name) {
      row.issues.push({
        type: 'error',
        field: 'name',
        message: 'Student Name is empty or missing (mandatory)',
      });
      missingNameCount++;
    }

    // Rule 2: Duplicate row detection
    const rowSig = `${name.toLowerCase()}|${hallTicketNumber.toLowerCase()}|${email.toLowerCase()}`;
    if ((seenRowSignatures.get(rowSig) || 0) > 1) {
      row.issues.push({
        type: 'warning',
        field: 'row',
        message: 'Duplicate record with identical name, hall ticket & email exists in this file',
      });
      duplicateRowCount++;
    }

    // Rule 3: Hall Ticket Number check (Strongly recommended)
    if (!hallTicketNumber) {
      row.issues.push({
        type: 'warning',
        field: 'hallTicketNumber',
        message: 'Hall Ticket Number is missing (strongly recommended)',
      });
    } else if ((seenHallTickets.get(hallTicketNumber.toUpperCase()) || 0) > 1) {
      row.issues.push({
        type: 'warning',
        field: 'hallTicketNumber',
        message: `Duplicate Hall Ticket "${hallTicketNumber}" found across multiple rows`,
      });
      duplicateHallTicketCount++;
    }

    // Rule 4: Email check (Recommended) & Format validation
    if (!email) {
      row.issues.push({
        type: 'warning',
        field: 'email',
        message: 'Email address is missing (recommended for student communications)',
      });
      missingEmailCount++;
    } else if (!EMAIL_REGEX.test(email)) {
      row.issues.push({
        type: 'warning',
        field: 'email',
        message: `Email "${email}" has an invalid format`,
      });
      invalidEmailCount++;
    }

    // Determine status
    const hasError = row.issues.some((iss) => iss.type === 'error');
    const hasWarning = row.issues.some((iss) => iss.type === 'warning');

    if (hasError) {
      row.validationStatus = 'invalid';
      invalidCount++;
    } else if (hasWarning) {
      row.validationStatus = 'attention';
      attentionCount++;
    } else {
      row.validationStatus = 'valid';
      validCount++;
    }
  }

  const summary: ValidationSummary = {
    totalRows: rows.length,
    validCount,
    attentionCount,
    invalidCount,
    missingNameCount,
    missingEmailCount,
    duplicateHallTicketCount,
    duplicateRowCount,
    invalidEmailCount,
    unexpectedColumns,
  };

  return { rows, summary };
}

/**
 * Generates next sequential Batch ID (e.g. BATCH-000001) from Cloud Firestore
 */
export async function generateNextBatchId(): Promise<string> {
  try {
    const colRef = collection(db, 'batches');
    const snap = await getDocs(query(colRef, orderBy('createdAt', 'desc'), limit(1)));

    let nextNumber = 1;
    if (!snap.empty) {
      const latestBatch = snap.docs[0].data();
      const codeOrId = latestBatch.code || latestBatch.batchId || snap.docs[0].id;
      const match = String(codeOrId).match(/BATCH-(\d+)/i);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      } else {
        // Fallback: use total count
        const countSnap = await getCountFromServer(colRef);
        nextNumber = countSnap.data().count + 1;
      }
    }

    const proposedId = `BATCH-${String(nextNumber).padStart(6, '0')}`;

    // Verify uniqueness
    const existingDoc = await getDoc(doc(db, 'batches', proposedId));
    if (existingDoc.exists()) {
      return `BATCH-${String(nextNumber + 1).padStart(6, '0')}`;
    }

    return proposedId;
  } catch (error) {
    console.warn('Could not determine next sequential batch ID, using fallback count:', error);
    const fallbackNum = Math.floor(100000 + Math.random() * 900000);
    return `BATCH-${fallbackNum}`;
  }
}

/**
 * Helper to fetch existing colleges
 */
export async function fetchCollegesList(): Promise<College[]> {
  try {
    const snap = await getDocs(query(collection(db, 'colleges'), limit(100)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<College, 'id'>) }));
  } catch (err) {
    console.warn('Could not fetch colleges:', err);
    return [];
  }
}

/**
 * Helper to fetch existing courses
 */
export async function fetchCoursesList(): Promise<Course[]> {
  try {
    const snap = await getDocs(query(collection(db, 'courses'), limit(100)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Course, 'id'>) }));
  } catch (err) {
    console.warn('Could not fetch courses:', err);
    return [];
  }
}

/**
 * Creates a new college inline if operator specified a custom one
 */
export async function createCollegeInline(name: string, code: string): Promise<string> {
  const colRef = collection(db, 'colleges');
  const nowStr = new Date().toISOString();
  const docRef = await addDoc(colRef, {
    name: name.trim(),
    code: code.trim().toUpperCase(),
    active: true,
    createdAt: nowStr,
    updatedAt: nowStr,
  });
  return docRef.id;
}

/**
 * Creates a new course inline if operator specified a custom one
 */
export async function createCourseInline(title: string, code: string): Promise<string> {
  const colRef = collection(db, 'courses');
  const nowStr = new Date().toISOString();
  const docRef = await addDoc(colRef, {
    title: title.trim(),
    code: code.trim().toUpperCase(),
    durationMonths: 3,
    active: true,
    createdAt: nowStr,
    updatedAt: nowStr,
  });
  return docRef.id;
}

export interface BatchImportParams {
  batchId: string;
  batchName: string;
  collegeId: string;
  collegeName: string;
  courseId: string;
  courseTitle: string;
  sourceFileName: string;
  records: ParsedStudentRow[];
  onProgress?: (progress: ImportProgress) => void;
}

/**
 * Executes chunked atomic Firestore import for the batch and its students
 */
export async function executeBatchImport(params: BatchImportParams): Promise<ImportResult> {
  const {
    batchId,
    batchName,
    collegeId,
    collegeName,
    courseId,
    courseTitle,
    sourceFileName,
    records,
    onProgress,
  } = params;

  const validRecords = records.filter((r) => r.validationStatus !== 'invalid');
  const skippedCount = records.length - validRecords.length;

  if (validRecords.length === 0) {
    throw new Error('No valid records to import. All rows have critical validation errors (e.g. missing name).');
  }

  const nowStr = new Date().toISOString();
  const todayDate = nowStr.split('T')[0];

  onProgress?.({
    current: 0,
    total: validRecords.length,
    percentage: 5,
    statusMessage: `Initializing ${batchId} cohort record in Cloud Firestore...`,
  });

  // Step 1: Create the Batch document
  try {
    const batchDocRef = doc(db, 'batches', batchId);
    await setDoc(batchDocRef, {
      id: batchId,
      batchId: batchId,
      name: batchName,
      code: batchId,
      collegeId: collegeId,
      collegeName: collegeName,
      courseId: courseId,
      courseTitle: courseTitle,
      studentCount: validRecords.length,
      sourceFileName: sourceFileName,
      startDate: todayDate,
      endDate: '',
      status: 'upcoming',
      idAssignmentStatus: 'PENDING',
      assignedStudentCount: 0,
      pendingStudentCount: validRecords.length,
      createdAt: nowStr,
      updatedAt: nowStr,
    });
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.CREATE, `batches/${batchId}`);
  }

  onProgress?.({
    current: 0,
    total: validRecords.length,
    percentage: 15,
    statusMessage: `Batch ${batchId} created. Preparing ${validRecords.length} student records for batched writing...`,
  });

  // Step 2: Write students in chunks of 250 (Firestore limit is 500 writes per batch)
  const CHUNK_SIZE = 250;
  let importedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
    const chunk = validRecords.slice(i, i + CHUNK_SIZE);
    const writeBatchInstance = writeBatch(db);

    chunk.forEach((row, chunkIdx) => {
      const overallIdx = i + chunkIdx;
      // Auto-generate Firestore student doc reference
      const studentDocRef = doc(collection(db, 'students'));
      // Phase 2 temporary student identifier (permanent student ID is Phase 3)
      const tempStudentId = `TMP-${batchId.replace('BATCH-', '')}-${String(overallIdx + 1).padStart(4, '0')}`;
      const searchFields = computeSearchFields({
        name: row.mapped.name,
        hallTicketNumber: row.mapped.hallTicketNumber || '',
        email: row.mapped.email || '',
        phone: row.mapped.phone || '',
        college: collegeName,
        batchId: batchId,
        studentId: tempStudentId,
        tempStudentId: tempStudentId,
      });

      writeBatchInstance.set(studentDocRef, {
        id: studentDocRef.id,
        name: row.mapped.name,
        hallTicketNumber: row.mapped.hallTicketNumber || '',
        email: row.mapped.email || '',
        phone: row.mapped.phone || '',
        college: collegeName,
        collegeId: collegeId,
        course: courseTitle,
        courseId: courseId,
        batch: batchName,
        batchId: batchId,
        studentId: tempStudentId,
        tempStudentId: tempStudentId,
        studentIdStatus: 'PENDING',
        ...searchFields,
        status: 'active',
        createdAt: nowStr,
        updatedAt: nowStr,
      });
    });

    try {
      await writeBatchInstance.commit();
      importedCount += chunk.length;

      const progressPercent = Math.min(
        95,
        15 + Math.round((importedCount / validRecords.length) * 80)
      );

      onProgress?.({
        current: importedCount,
        total: validRecords.length,
        percentage: progressPercent,
        statusMessage: `Written ${importedCount} of ${validRecords.length} student records into Firestore...`,
      });
    } catch (err: unknown) {
      console.error(`Batch write failed at chunk ${i} - ${i + chunk.length}`, err);
      errors.push(`Chunk ${i / CHUNK_SIZE + 1} write failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Step 3: Record Activity Audit Log
  onProgress?.({
    current: importedCount,
    total: validRecords.length,
    percentage: 98,
    statusMessage: 'Recording operational audit activity...',
  });

  try {
    await recordActivity({
      actionType: 'STUDENT_DATA_UPLOADED',
      description: `${importedCount} students imported into ${batchId} (${batchName}). Source: ${sourceFileName}`,
      category: 'student',
    });
  } catch (err) {
    console.warn('Could not record activity log:', err);
  }

  onProgress?.({
    current: importedCount,
    total: validRecords.length,
    percentage: 100,
    statusMessage: 'Import successfully completed!',
  });

  return {
    batchId,
    batchName,
    collegeName,
    courseTitle,
    totalProcessed: records.length,
    importedCount,
    skippedCount,
    errorCount: errors.length,
    errors,
  };
}

/**
 * Generates and triggers browser download of official sample Excel (.xlsx) file
 */
export function downloadSampleExcelTemplate(): void {
  const sampleData = [
    {
      'Student Name': 'Aarav Sharma',
      'Hall Ticket Number': '21B91A0501',
      'Email Address': 'aarav.sharma@example.com',
      'Phone Number': '9876543210',
      'College Name': 'Sreenidhi Institute of Science and Technology',
      'Course / Branch': 'Full Stack Web Development',
    },
    {
      'Student Name': 'Ananya Reddy',
      'Hall Ticket Number': '21B91A0502',
      'Email Address': 'ananya.reddy@example.com',
      'Phone Number': '9876543211',
      'College Name': 'Sreenidhi Institute of Science and Technology',
      'Course / Branch': 'Full Stack Web Development',
    },
    {
      'Student Name': 'Rohan Varma',
      'Hall Ticket Number': '21B91A0503',
      'Email Address': 'rohan.varma@example.com',
      'Phone Number': '9876543212',
      'College Name': 'VNR Vignana Jyothi Institute of Engineering',
      'Course / Branch': 'Artificial Intelligence & Machine Learning',
    },
    {
      'Student Name': 'Sneha Patel',
      'Hall Ticket Number': '21B91A0504',
      'Email Address': 'sneha.patel@example.com',
      'Phone Number': '9876543213',
      'College Name': 'VNR Vignana Jyothi Institute of Engineering',
      'Course / Branch': 'Artificial Intelligence & Machine Learning',
    },
    {
      'Student Name': 'Karthik Rao',
      'Hall Ticket Number': '21B91A0505',
      'Email Address': 'karthik.rao@example.com',
      'Phone Number': '9876543214',
      'College Name': 'Chaitanya Bharathi Institute of Technology',
      'Course / Branch': 'Cloud Computing & DevOps',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 22 }, // Student Name
    { wch: 22 }, // Hall Ticket Number
    { wch: 32 }, // Email Address
    { wch: 18 }, // Phone Number
    { wch: 42 }, // College Name
    { wch: 35 }, // Course / Branch
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  XLSX.writeFile(workbook, 'codeneksa_student_template.xlsx');
}

/**
 * Generates sample CSV text template for operator download
 */
export function generateSampleCsvContent(): string {
  return `Student Name,Hall Ticket Number,Email,Phone,College Name,Course
Aarav Sharma,22A91A0501,aarav.sharma@example.edu,+91 9876543210,Hyderabad Institute of Tech,Full Stack Web Development
Priya Patel,22A91A0502,priya.patel@example.edu,+91 9876543211,Hyderabad Institute of Tech,Full Stack Web Development
Rahul Verma,22A91A0503,rahul.v@example.edu,+91 9876543212,Hyderabad Institute of Tech,Full Stack Web Development
Sneha Reddy,22A91A0504,sneha.reddy@example.edu,+91 9876543213,Hyderabad Institute of Tech,Full Stack Web Development
Kiran Kumar,22A91A0505,kiran.k@example.edu,+91 9876543214,Hyderabad Institute of Tech,Full Stack Web Development
Ananya Rao,22A91A0506,ananya.rao@example.edu,+91 9876543215,Hyderabad Institute of Tech,Full Stack Web Development
Vikram Singh,22A91A0507,vikram.s@example.edu,+91 9876543216,Hyderabad Institute of Tech,Full Stack Web Development
Neha Gupta,22A91A0508,neha.gupta@example.edu,+91 9876543217,Hyderabad Institute of Tech,Full Stack Web Development`;
}
