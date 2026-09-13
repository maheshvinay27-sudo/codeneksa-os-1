/**
 * Codeneksa OS - Core Types & Interfaces
 * Designed for scalable EdTech operational automation
 */

export type UserRole = 'admin' | 'staff' | 'operator';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export type StudentStatus = 'active' | 'graduated' | 'dropped' | 'pending';

export interface Student {
  id: string;
  name: string;
  hallTicketNumber: string;
  hallTicket?: string;
  college: string;
  collegeId: string;
  course: string;
  courseId: string;
  batch: string;
  batchId: string;
  email: string;
  phone: string;
  studentId: string; // Permanent Codeneksa Student ID (e.g. CKS-000001) or temporary ref ID
  tempStudentId?: string; // Preserved original temporary reference ID (e.g. TMP-000001-0001)
  studentIdStatus?: 'PENDING' | 'ASSIGNED';
  studentIdAssignedAt?: string;
  studentIdAssignedBy?: string;
  // Phase 5: Welcome Email Employee integration fields
  welcomeEmailStatus?: 'NOT_SENT' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  welcomeEmailSentAt?: string;
  welcomeEmailLastAttemptAt?: string;
  welcomeEmailRetryCount?: number;
  welcomeEmailError?: string;
  welcomeEmailMessageId?: string;
  welcomeEmailTemplateId?: string;
  // Phase 6: Certificate Employee integration fields
  certificateStatus?: 'NOT_GENERATED' | 'GENERATING' | 'GENERATED' | 'FAILED' | 'REVOKED';
  certificateNumber?: string;
  certificateId?: string;
  certificateIssuedAt?: string;
  certificateStoragePath?: string;
  certificateDownloadUrl?: string;
  certificateVerificationId?: string;
  // Normalized search fields for fast, zero-scan Firestore lookup
  searchName?: string;
  searchStudentId?: string;
  searchTempStudentId?: string;
  searchHallTicket?: string;
  searchEmail?: string;
  searchPhone?: string;
  searchCollege?: string;
  searchBatchId?: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface College {
  id: string;
  name: string;
  code: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  title: string;
  code: string;
  description?: string;
  durationMonths: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus = 'upcoming' | 'ongoing' | 'completed' | 'archived';

export interface Batch {
  id: string;
  batchId?: string;
  name: string;
  code: string;
  courseId: string;
  courseTitle?: string;
  course?: string;
  collegeId: string;
  collegeName?: string;
  college?: string;
  studentCount?: number;
  sourceFileName?: string;
  startDate: string;
  endDate: string;
  status: BatchStatus;
  idAssignmentStatus?: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  assignedStudentCount?: number;
  pendingStudentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type TargetStudentField =
  | 'name'
  | 'hallTicketNumber'
  | 'email'
  | 'phone'
  | 'college'
  | 'course';

export interface ColumnMappingConfig {
  name: string; // raw column name in uploaded file
  hallTicketNumber: string;
  email: string;
  phone: string;
  college: string;
  course: string;
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  field: string;
  message: string;
}

export interface ParsedStudentRow {
  rowIndex: number; // 1-based row index in file
  raw: Record<string, any>;
  mapped: {
    name: string;
    hallTicketNumber: string;
    email: string;
    phone: string;
    college: string;
    course: string;
  };
  validationStatus: 'valid' | 'attention' | 'invalid';
  issues: ValidationIssue[];
}

export interface ValidationSummary {
  totalRows: number;
  validCount: number;
  attentionCount: number;
  invalidCount: number;
  missingNameCount: number;
  missingEmailCount: number;
  duplicateHallTicketCount: number;
  duplicateRowCount: number;
  invalidEmailCount: number;
  unexpectedColumns: string[];
}

export interface ImportProgress {
  current: number;
  total: number;
  percentage: number;
  statusMessage: string;
}

export interface ImportResult {
  batchId: string;
  batchName: string;
  collegeName: string;
  courseTitle: string;
  totalProcessed: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
}

// Phase 6: Simple Certificate Generator Types
export type CertificateStatus = 'PENDING' | 'GENERATING' | 'GENERATED' | 'FAILED' | 'REVOKED';

export interface CertificateCalibrationConfig {
  xPercent: number; // 0 to 100, default 50 (centered)
  yPercent: number; // 0 to 100, default 48 (middle-upper name area)
  fontSize: number; // font size in pt/px (default 38)
  fontFamily: 'Helvetica' | 'Times-Roman' | 'Courier';
  fontWeight: 'normal' | 'bold';
  color: string; // hex color code (default #111827)
  alignment: 'center' | 'left' | 'right';
  maxWidthPercent: number; // default 80
  includeCertNumber?: boolean;
  certNumberXPercent?: number; // default 20
  certNumberYPercent?: number; // default 86
  certNumberFontSize?: number; // default 13
}

export interface CertificateTemplate {
  id: string;
  templateId: string;
  name: string;
  version: number | string;
  storagePath: string;
  fileName: string;
  fileUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  calibration?: CertificateCalibrationConfig;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ParsedCertificateStudent {
  id: string;
  originalIndex: number;
  name: string;
  college?: string;
  course?: string;
  email?: string;
  hallTicketNumber?: string;
  rawRow: Record<string, unknown>;
  isDuplicate?: boolean;
  isValid: boolean;
  skipReason?: string;
}

export interface StudentDataValidationResult {
  fileName: string;
  totalRows: number;
  validStudents: ParsedCertificateStudent[];
  skippedRows: ParsedCertificateStudent[];
  duplicateCount: number;
  columnsFound: string[];
  detectedNameColumn: string;
}

export interface CertificateRecord {
  id: string;
  certificateId: string;
  certificateNumber: string; // e.g. CKS-CERT-000001
  studentId: string; // Permanent Codeneksa Student ID (e.g. CKS-000001)
  studentDocId?: string;
  studentName: string;
  collegeName: string;
  courseProgram: string;
  batchId: string;
  batchName?: string;
  status: CertificateStatus;
  generatedAt?: string;
  generatedBy?: string;
  templateId: string;
  templateVersion: string | number;
  filePath?: string;
  fileUrl?: string;
  generationError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateMetrics {
  totalCertificates: number;
  generatedCount: number;
  pendingCount: number;
  failedCount: number;
}

export type EmailLogStatus = 'NOT_SENT' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'queued' | 'sent' | 'failed';

export interface EmailLog {
  id: string;
  emailLogId?: string;
  studentId: string;
  studentDocId?: string;
  batchId?: string;
  recipientEmail: string;
  recipientName?: string;
  emailType: 'WELCOME_EMAIL' | 'BATCH_ANNOUNCEMENT' | 'CERTIFICATE_DELIVERY' | string;
  templateId?: string;
  subject: string;
  status: EmailLogStatus;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  idempotencyKey?: string;
  sentAt?: string;
  failedAt?: string;
  queuedAt?: string;
  createdBy?: string;
  triggeredBy?: string;
  createdAt: string;
  isTest?: boolean;
}

export interface EmailTemplate {
  id: string;
  templateName: string;
  emailType: string;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailProviderConfig {
  configured: boolean;
  provider: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
  testRecipient: string;
}

export interface WelcomeMailKPIs {
  totalStudents: number;
  sentCount: number;
  pendingCount: number;
  failedCount: number;
  notSentCount: number;
}

export interface WelcomeMailBatchStats {
  batchId: string;
  batchName: string;
  collegeName: string;
  courseTitle: string;
  totalStudents: number;
  studentsWithEmail: number;
  studentsWithoutEmail: number;
  alreadySentCount: number;
  pendingCount: number;
  failedCount: number;
}

export interface WelcomeMailJobItem {
  student: Student;
  validEmail: boolean;
  alreadySent: boolean;
  status: 'NOT_SENT' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  errorMessage?: string;
  providerMessageId?: string;
}

export type ActivityActionType =
  | 'STUDENT_DATA_UPLOADED'
  | 'STUDENT_IDS_GENERATED'
  | 'STUDENT_IDS_ASSIGNED'
  | 'STUDENT_SEARCH_PERFORMED'
  | 'STUDENT_PROFILE_VIEWED'
  | 'WELCOME_EMAILS_SENT'
  | 'WELCOME_EMAIL_TEMPLATE_CREATED'
  | 'WELCOME_EMAIL_TEMPLATE_UPDATED'
  | 'WELCOME_EMAIL_PREVIEWED'
  | 'WELCOME_EMAIL_SEND_STARTED'
  | 'WELCOME_EMAIL_SENT'
  | 'WELCOME_EMAIL_FAILED'
  | 'WELCOME_EMAIL_RETRIED'
  | 'WELCOME_EMAIL_BULK_SEND_STARTED'
  | 'WELCOME_EMAIL_BULK_SEND_COMPLETED'
  | 'WELCOME_EMAIL_BULK_SEND_PARTIAL_FAILURE'
  | 'CERTIFICATE_GENERATION_STARTED'
  | 'CERTIFICATE_GENERATED'
  | 'CERTIFICATE_GENERATION_FAILED'
  | 'CERTIFICATE_DOWNLOADED'
  | 'CERTIFICATE_BULK_GENERATED'
  | 'CERTIFICATE_REVOKED'
  | 'CERTIFICATE_REGENERATED'
  | 'CERTIFICATES_GENERATED'
  | 'CERTIFICATE_TEMPLATE_UPLOADED'
  | 'CERTIFICATE_TEMPLATE_ACTIVATED'
  | 'CERTIFICATE_TEMPLATE_REPLACED'
  | 'CERTIFICATE_RECORD_CREATED'
  | 'COURSE_CREATED'
  | 'BATCH_CREATED'
  | 'COLLEGE_ADDED'
  | 'USER_LOGIN'
  | 'SYSTEM_INITIALIZED';

export interface ActivityLog {
  id: string;
  actionType: ActivityActionType;
  description: string;
  performedByUserId: string;
  performedByEmail: string;
  timestamp: string;
  category?: 'student' | 'system' | 'communication' | 'academic' | 'certificate';
  metadata?: Record<string, unknown>;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SystemCounter {
  id: string;
  currentNumber: number;
  prefix: string;
  padding: number;
  lastUpdated?: string;
  lastBatchId?: string;
}

export type NavSection =
  | 'dashboard'
  | 'students'
  | 'students-all'
  | 'students-batches'
  | 'students-search'
  | 'students-id-employee'
  | 'colleges'
  | 'courses'
  | 'certificates'
  | 'communication'
  | 'communication-welcome-mail'
  | 'analytics'
  | 'settings';

export interface DashboardMetrics {
  totalStudents: number;
  studentsWithId: number;
  studentsAwaitingId: number;
  idAssignmentRate: number;
  totalColleges: number;
  totalCourses: number;
  totalBatches: number;
  batchesAwaitingId: number;
  totalEmails?: number;
  isLoading: boolean;
}

export interface StudentIdEmployeeStats {
  totalStudents: number;
  studentsAwaitingId: number;
  studentsAssignedId: number;
  batchesAwaitingId: number;
  totalBatches: number;
}

export interface IdAssignmentPreviewItem {
  studentDocId: string;
  studentName: string;
  hallTicketNumber?: string;
  currentReferenceId: string;
  newCodeneksaId: string;
  alreadyAssigned: boolean;
}

export interface IdAssignmentProgress {
  processed: number;
  total: number;
  successful: number;
  failed: number;
  remaining: number;
  percentage: number;
  statusMessage: string;
}

export interface IdAssignmentResult {
  batchId: string;
  batchName: string;
  totalStudents: number;
  alreadyAssignedCount: number;
  newlyAssignedCount: number;
  assignedIds: string[];
  startId?: string;
  endId?: string;
  success: boolean;
  error?: string;
}

export interface SystemStatus {
  firestoreConnected: boolean;
  authConnected: boolean;
  latencyMs: number;
  environment: 'production' | 'development' | 'preview';
  projectId: string;
  databaseId: string;
}

export type SearchCategory =
  | 'all'
  | 'studentId'
  | 'name'
  | 'hallTicket'
  | 'email'
  | 'phone'
  | 'college'
  | 'batch';

export interface StudentSearchFilters {
  category: SearchCategory;
  query: string;
  collegeId: string; // 'all' or specific college name/id
  courseId: string;  // 'all' or specific course name/id
  batchId: string;   // 'all' or specific batch id
  status: string;    // 'all' | 'active' | 'graduated' | 'dropped' | 'pending' | 'suspended'
}

export interface StudentSearchResult {
  students: Student[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface NormalizedSearchFields {
  searchName: string;
  searchStudentId: string;
  searchTempStudentId: string;
  searchHallTicket: string;
  searchEmail: string;
  searchPhone: string;
  searchCollege: string;
  searchBatchId: string;
}

export interface MasterAccessConfig {
  username: string;
  password: string;
  passcodeEmail: string;
  updatedAt?: string;
  updatedBy?: string;
}

