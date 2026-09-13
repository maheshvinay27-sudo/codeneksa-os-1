import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { EmailTemplate, Student } from '../types';
import { recordActivity } from './dashboardService';
import { handleFirestoreError, OperationType } from './firestoreError';

export const DEFAULT_WELCOME_TEMPLATE_ID = 'default-welcome-email';

export const DEFAULT_WELCOME_TEMPLATE: EmailTemplate = {
  id: DEFAULT_WELCOME_TEMPLATE_ID,
  templateName: 'Standard Codeneksa Student Welcome',
  emailType: 'WELCOME_EMAIL',
  subject: 'Welcome to Codeneksa — Your Student ID {{studentId}}',
  body: `Dear {{studentName}},

Welcome to Codeneksa.

We are pleased to have you registered with us.

Your official Codeneksa Student ID is:

{{studentId}}

Academic Details:

College: {{collegeName}}
Course: {{courseName}}
Batch: {{batchId}}

Please keep your Codeneksa Student ID safe. It will be used to identify your records across Codeneksa services.

We look forward to supporting your learning journey.

Regards,

Codeneksa Team
{{senderName}}`,
  senderName: 'Codeneksa Admissions',
  senderEmail: 'admissions@codeneksa.com',
  replyTo: 'support@codeneksa.com',
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const TEMPLATE_VARIABLES = [
  { key: '{{studentName}}', label: 'Student Name', description: 'Full name of the student' },
  { key: '{{studentId}}', label: 'Student ID', description: 'Permanent CKS-xxxx ID or Reference ID' },
  { key: '{{tempStudentId}}', label: 'Temp Ref ID', description: 'Original temporary reference number' },
  { key: '{{hallTicket}}', label: 'Hall Ticket No', description: 'University hall ticket number' },
  { key: '{{email}}', label: 'Student Email', description: 'Primary email address' },
  { key: '{{phone}}', label: 'Phone Number', description: 'Mobile contact number' },
  { key: '{{collegeName}}', label: 'College', description: 'Associated institution name' },
  { key: '{{courseName}}', label: 'Course', description: 'Enrolled degree or program' },
  { key: '{{batchId}}', label: 'Batch ID', description: 'Academic cohort identifier' },
  { key: '{{senderName}}', label: 'Sender Name', description: 'Operations team or department' },
];

/**
 * Replace template variables with actual student and context data
 */
export function renderTemplate(
  template: {
    subject: string;
    body: string;
    senderName?: string;
    senderEmail?: string;
    replyTo?: string;
  },
  student: Partial<Student>,
  options?: {
    collegeName?: string;
    courseName?: string;
    senderName?: string;
  }
): { subject: string; body: string; html: string } {
  const studentName = student.name || 'Valued Student';
  const studentId = student.studentId || student.tempStudentId || 'PENDING';
  const tempStudentId = student.tempStudentId || '—';
  const hallTicket = student.hallTicket || student.hallTicketNumber || '—';
  const email = student.email || '';
  const phone = student.phone || '—';
  const collegeName = options?.collegeName || student.college || 'Codeneksa Partner Institute';
  const courseName = options?.courseName || student.course || 'Certificate Program';
  const batchId = student.batchId || student.batch || 'General Admissions';
  const senderName = options?.senderName || template.senderName || 'Codeneksa Admissions';

  const replaceVars = (text: string): string => {
    return text
      .replace(/\{\{studentName\}\}/g, studentName)
      .replace(/\{\{studentId\}\}/g, studentId)
      .replace(/\{\{tempStudentId\}\}/g, tempStudentId)
      .replace(/\{\{hallTicket\}\}/g, hallTicket)
      .replace(/\{\{email\}\}/g, email)
      .replace(/\{\{phone\}\}/g, phone)
      .replace(/\{\{collegeName\}\}/g, collegeName)
      .replace(/\{\{courseName\}\}/g, courseName)
      .replace(/\{\{batchId\}\}/g, batchId)
      .replace(/\{\{senderName\}\}/g, senderName);
  };

  const renderedSubject = replaceVars(template.subject);
  const renderedBody = replaceVars(template.body);

  // Format custom rendered body into clean HTML paragraphs
  const formattedBodyHtml = renderedBody
    .split(/\n\n+/)
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';
      const withBreaks = trimmed.replace(/\n/g, '<br />');
      return `<p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.65;">${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  // Generate responsive, accessible HTML email
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${renderedSubject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #334155;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      padding: 32px 32px 28px;
      color: #ffffff;
      text-align: left;
    }
    .header-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background-color: rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
      border: 1px solid rgba(165, 180, 252, 0.3);
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #ffffff;
    }
    .content {
      padding: 36px 32px;
      font-size: 15px;
      color: #334155;
    }
    .content p {
      margin: 0 0 16px;
    }
    .id-card {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 20px 24px;
      margin: 24px 0;
      text-align: center;
    }
    .id-card .label {
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 6px;
    }
    .id-card .number {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 26px;
      font-weight: 800;
      color: #4338ca;
      letter-spacing: 0.05em;
    }
    .meta-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 14px;
    }
    .meta-row:last-child {
      border-bottom: none;
    }
    .meta-label {
      color: #64748b;
      font-weight: 500;
    }
    .meta-value {
      color: #0f172a;
      font-weight: 600;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="header-badge">Official Communication</span>
        <h1>Codeneksa Student Admissions</h1>
      </div>
      <div class="content">
        ${formattedBodyHtml}
        
        <div class="id-card">
          <div class="label">Official Codeneksa Student ID</div>
          <div class="number">${studentId}</div>
        </div>

        <div class="meta-box">
          <div class="meta-row">
            <span class="meta-label">College</span>
            <span class="meta-value">${collegeName}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Course</span>
            <span class="meta-value">${courseName}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Batch</span>
            <span class="meta-value">${batchId}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Hall Ticket</span>
            <span class="meta-value">${hallTicket}</span>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>This is an official automated notification dispatched by Codeneksa OS.</p>
        <p>For questions or assistance, reply to <a href="mailto:${template.replyTo || 'support@codeneksa.com'}" style="color: #4f46e5; text-decoration: none;">${template.replyTo || 'support@codeneksa.com'}</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: renderedSubject,
    body: renderedBody,
    html,
  };
}

/**
 * Fetch all email templates from Firestore or fallback to default
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    const colRef = collection(db, 'emailTemplates');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      // Seed the default template into Firestore
      await setDoc(doc(db, 'emailTemplates', DEFAULT_WELCOME_TEMPLATE.id), DEFAULT_WELCOME_TEMPLATE);
      return [DEFAULT_WELCOME_TEMPLATE];
    }
    const templates = snap.docs.map((d) => d.data() as EmailTemplate);
    return templates;
  } catch (error) {
    console.warn('Could not read emailTemplates collection, using default template:', error);
    return [DEFAULT_WELCOME_TEMPLATE];
  }
}

/**
 * Fetch or initialize the default welcome email template
 */
export async function getDefaultWelcomeTemplate(): Promise<EmailTemplate> {
  // Check localStorage cache first for instant load
  try {
    const cached = localStorage.getItem('codeneksa_custom_mail_message');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.body && parsed.subject) {
        // Also fire background sync with Firestore
        getDoc(doc(db, 'emailTemplates', DEFAULT_WELCOME_TEMPLATE_ID)).then((snap) => {
          if (snap.exists()) {
            localStorage.setItem('codeneksa_custom_mail_message', JSON.stringify(snap.data()));
          } else {
            setDoc(doc(db, 'emailTemplates', DEFAULT_WELCOME_TEMPLATE_ID), parsed);
          }
        }).catch(() => {});
        return parsed as EmailTemplate;
      }
    }
  } catch (e) {
    console.warn('LocalStorage error reading custom mail template:', e);
  }

  try {
    const docRef = doc(db, 'emailTemplates', DEFAULT_WELCOME_TEMPLATE_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as EmailTemplate;
      try {
        localStorage.setItem('codeneksa_custom_mail_message', JSON.stringify(data));
      } catch (_) {}
      return data;
    }
    // Create default
    await setDoc(docRef, DEFAULT_WELCOME_TEMPLATE);
    try {
      localStorage.setItem('codeneksa_custom_mail_message', JSON.stringify(DEFAULT_WELCOME_TEMPLATE));
    } catch (_) {}
    return DEFAULT_WELCOME_TEMPLATE;
  } catch (error) {
    console.warn('Error fetching default welcome template from Firestore:', error);
    try {
      const cached = localStorage.getItem('codeneksa_custom_mail_message');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return DEFAULT_WELCOME_TEMPLATE;
  }
}

/**
 * Save or update an email template
 */
export async function saveEmailTemplate(template: EmailTemplate): Promise<void> {
  const docRef = doc(db, 'emailTemplates', template.id || DEFAULT_WELCOME_TEMPLATE_ID);
  const updatedData: EmailTemplate = {
    ...template,
    id: template.id || DEFAULT_WELCOME_TEMPLATE_ID,
    updatedAt: new Date().toISOString(),
  };

  // Always save immediately to client cache
  try {
    localStorage.setItem('codeneksa_custom_mail_message', JSON.stringify(updatedData));
  } catch (e) {
    console.warn('Failed to cache custom mail message in localStorage:', e);
  }

  try {
    await setDoc(docRef, updatedData, { merge: true });
    await recordActivity({
      actionType: 'WELCOME_EMAIL_TEMPLATE_UPDATED' as any,
      description: `Updated welcome email message "${template.subject || template.templateName}"`,
      category: 'communication',
    });
  } catch (err) {
    console.error('Firestore save template error:', err);
    // Even if firestore has permission or network issue, it was saved in localStorage
    // Re-throw if critical or handle gracefully
    handleFirestoreError(err, OperationType.WRITE, 'emailTemplates');
  }
}
