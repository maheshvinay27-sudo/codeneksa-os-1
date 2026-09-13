import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Award,
  Upload,
  FileSpreadsheet,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Eye,
  Archive,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Database,
  ExternalLink,
  ChevronRight,
  FileDown,
  X,
  ShieldAlert,
  Printer,
  Search,
} from 'lucide-react';
import {
  CertificateTemplate,
  ParsedCertificateStudent,
  StudentDataValidationResult,
  CertificateRecord,
  CertificateCalibrationConfig,
} from '../types';
import {
  uploadCertificateTemplate,
  getActiveCertificateTemplate,
  getCertificateTemplates,
  getCertificateRecords,
} from '../services/certificateFoundationService';
import {
  DEFAULT_CALIBRATION,
  parseStudentSpreadsheet,
  generateSampleStudents,
  generateAndStoreCertificateRecord,
  generateCertificateBatch,
  generateSingleCertificatePdf,
  renderCertificatePreviewDataUrl,
  downloadCertificatesAsZip,
  createDefaultMasterPngBlob,
  fetchImageBytes,
} from '../services/certificateGeneratorService';
import { Button } from '../components/common/Button';
import { CalibrationModal } from '../components/certificates/CalibrationModal';
import { TemplatePreviewModal } from '../components/certificates/TemplatePreviewModal';
import { CertificateViewerModal } from '../components/certificates/CertificateViewerModal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export const CertificatesPage: React.FC = () => {
  const { userProfile, isAuthenticated } = useAuth();
  const { success, error, info } = useNotification();

  // Template State
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  // Student Data State
  const [studentValidation, setStudentValidation] = useState<StudentDataValidationResult | null>(null);
  const [selectedNameCol, setSelectedNameCol] = useState<string>('');
  const [isParsingSpreadsheet, setIsParsingSpreadsheet] = useState(false);
  const [rawUploadedFile, setRawUploadedFile] = useState<File | null>(null);

  // Modals State
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isReadyToGenerateModalOpen, setIsReadyToGenerateModalOpen] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState<{
    studentName: string;
    certificateNumber: string;
    pdfBytes?: Uint8Array;
    previewUrl?: string;
    fileUrl?: string;
    generatedDate: string;
  } | null>(null);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [generatedRunRecords, setGeneratedRunRecords] = useState<{
    studentName: string;
    certificateNumber: string;
    pdfBytes: Uint8Array;
    previewUrl?: string;
    fileUrl?: string;
    recordId: string;
    generatedDate: string;
  }[]>([]);

  // Persistent Main Database Certificates State
  const [issuedDatabaseRecords, setIssuedDatabaseRecords] = useState<CertificateRecord[]>([]);
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false);
  const [databaseSearchQuery, setDatabaseSearchQuery] = useState('');

  // DOM ref for scrolling to generated output & database section
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const databaseSectionRef = useRef<HTMLDivElement>(null);

  // Drag and drop refs
  const templateInputRef = useRef<HTMLInputElement>(null);
  const studentInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingTemplate, setIsDraggingTemplate] = useState(false);
  const [isDraggingStudent, setIsDraggingStudent] = useState(false);

  // Load existing active template on mount (with instant local cache fallback)
  const loadActiveTemplate = useCallback(async () => {
    try {
      const cached = localStorage.getItem('codeneksa_active_master_template');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && (parsed.fileUrl || parsed.dataUrl)) {
            setTemplate(parsed);
          }
        } catch {
          // ignore cache parse error
        }
      }

      const active = await getActiveCertificateTemplate();
      if (active) {
        setTemplate(active);
      } else {
        const all = await getCertificateTemplates();
        if (all.length > 0) {
          setTemplate(all[0]);
        }
      }
    } catch (err) {
      console.warn('Could not load active template from Firestore:', err);
    }
  }, []);

  // Fetch all persisted certificates from the main Firestore database
  const fetchDatabaseCertificates = useCallback(async () => {
    setIsLoadingDatabase(true);
    try {
      const records = await getCertificateRecords();
      setIssuedDatabaseRecords(records || []);
    } catch (err) {
      console.warn('Could not fetch certificates from database:', err);
    } finally {
      setIsLoadingDatabase(false);
    }
  }, []);

  useEffect(() => {
    loadActiveTemplate();
    fetchDatabaseCertificates();
  }, [loadActiveTemplate, fetchDatabaseCertificates]);

  // Handle Master PNG Upload - instantly enabled & active
  const handleTemplateFileSelect = async (file: File) => {
    const isImage = (file.type && file.type.startsWith('image/')) || /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!isImage) {
      error('Invalid File', 'Please upload a valid PNG certificate image.');
      return;
    }

    setIsUploadingTemplate(true);
    setTemplateFile(file);

    try {
      // 1. Read file as high-fidelity Base64 Data URL for zero CORS and instant preview
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 2. Measure natural dimensions from the image
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth || 2000, height: img.naturalHeight || 1414 });
        img.onerror = () => resolve({ width: 2000, height: 1414 });
        img.src = dataUrl;
      });

      const templateId = `tpl_${Date.now()}`;
      const now = new Date().toISOString();
      const newTemplate: CertificateTemplate = {
        id: templateId,
        templateId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        version: '1',
        storagePath: `certificate-templates/${templateId}/1/master.png`,
        fileName: file.name,
        fileUrl: dataUrl,
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
        calibration: template?.calibration || DEFAULT_CALIBRATION,
        isActive: true,
        createdAt: now,
        createdBy: userProfile?.email || 'Admin',
        updatedAt: now,
        updatedBy: userProfile?.email || 'Admin',
      };

      // 3. Immediately enable and activate template in UI state and persistent storage
      setTemplate(newTemplate);
      try {
        localStorage.setItem('codeneksa_active_master_template', JSON.stringify(newTemplate));
      } catch (lsErr) {
        console.warn('Could not cache template in localStorage:', lsErr);
      }

      success('Master Template Saved', `Uploaded "${file.name}" (${dimensions.width} × ${dimensions.height} px) as active artwork.`);

      // 4. Fire-and-forget sync to Firebase in the background
      uploadCertificateTemplate(file, file.name.replace(/\.[^/.]+$/, '')).catch((syncErr) => {
        console.warn('Firebase background template sync notice:', syncErr);
      });
    } catch (err) {
      error('Upload Failed', err instanceof Error ? err.message : 'Could not process certificate image.');
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  // Quick action: Load default master template (2000x1414 Codeneksa artwork)
  const handleLoadDefaultTemplate = async () => {
    setIsUploadingTemplate(true);
    try {
      const { file } = await createDefaultMasterPngBlob();
      const newTemplate = await uploadCertificateTemplate(file, 'Codeneksa Official Master Certificate');
      setTemplate(newTemplate);
      try {
        localStorage.setItem('codeneksa_active_master_template', JSON.stringify(newTemplate));
      } catch {
        // ignore
      }
      success('Master Artwork Loaded', 'Initialized official Codeneksa certificate artwork (2000 × 1414 px).');
    } catch (err) {
      error('Initialization Failed', err instanceof Error ? err.message : 'Could not initialize template.');
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  // Handle Student Spreadsheet Upload
  const handleSpreadsheetSelect = async (file: File, forcedCol?: string) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.csv')) {
      error('Unsupported Format', 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    setIsParsingSpreadsheet(true);
    setRawUploadedFile(file);

    try {
      const result = await parseStudentSpreadsheet(file, forcedCol);
      setStudentValidation(result);
      if (result.detectedNameColumn) {
        setSelectedNameCol(result.detectedNameColumn);
        success(
          'Student Data Loaded',
          `Found ${result.validStudents.length} student names using column "${result.detectedNameColumn}".`
        );
      } else {
        info(
          'Column Selection Required',
          'Student name column not found. Please select which column represents student names.'
        );
      }
    } catch (err) {
      error('Parsing Failed', err instanceof Error ? err.message : 'Could not parse student file.');
    } finally {
      setIsParsingSpreadsheet(false);
    }
  };

  // Handle column change if auto-detection missed
  const handleApplyColumnSelection = () => {
    if (!selectedNameCol) {
      error('No Column Selected', 'Please choose a header from the list.');
      return;
    }
    if (rawUploadedFile) {
      handleSpreadsheetSelect(rawUploadedFile, selectedNameCol);
    }
  };

  // Single Demo Student to instantly verify how certificate printing looks
  const handleLoadSingleDemoStudent = () => {
    const singleStudent: ParsedCertificateStudent = {
      id: 'demo_student_1',
      originalIndex: 1,
      name: 'Rahul Sharma',
      college: 'Codeneksa Institute of Technology',
      course: 'Full Stack Web Development',
      email: 'rahul.sharma@example.com',
      rawRow: { 'Student Name': 'Rahul Sharma', College: 'Codeneksa Institute of Technology' },
      isValid: true,
    };

    setStudentValidation({
      fileName: 'print_verification_demo.xlsx',
      totalRows: 1,
      validStudents: [singleStudent],
      skippedRows: [],
      duplicateCount: 0,
      columnsFound: ['Student Name', 'College', 'Course', 'Email'],
      detectedNameColumn: 'Student Name',
    });
    setSelectedNameCol('Student Name');
    success('Demo Student Ready', 'Loaded 1 student ("Rahul Sharma") to verify how certificate printing looks.');
  };

  // Reset workspace state safely without altering stored database
  const handleReset = () => {
    setStudentValidation(null);
    setRawUploadedFile(null);
    setSelectedNameCol('');
    setGeneratedRunRecords([]);
    setGenerationProgress({ current: 0, total: 0, currentName: '' });
    info('Workspace Reset', 'Cleared current student data and generation preview.');
  };

  // Open Generation Preview Modal
  const handleOpenGenerationPreview = () => {
    if (!template?.fileUrl) {
      error('Missing Template', 'Upload a master certificate template and student data to continue.');
      return;
    }
    if (!studentValidation || studentValidation.validStudents.length === 0) {
      error('Missing Student Data', 'Upload a master certificate template and student data to continue.');
      return;
    }
    setIsReadyToGenerateModalOpen(true);
  };

  // Trigger Certificate Generation
  const handleGenerateCertificates = async () => {
    setIsReadyToGenerateModalOpen(false);

    if (!template?.fileUrl) {
      error('Missing Template', 'Please upload a master PNG certificate template first.');
      return;
    }
    if (!studentValidation || studentValidation.validStudents.length === 0) {
      error('Missing Students', 'Please upload student data Excel or CSV file.');
      return;
    }

    setIsGenerating(true);
    const studentsToProcess = studentValidation.validStudents;

    try {
      // 1. Fetch or decode master PNG bytes (never blocks due to built-in timeout & fallback)
      let pngBytes: Uint8Array;
      if (templateFile) {
        const buffer = await templateFile.arrayBuffer();
        pngBytes = new Uint8Array(buffer);
      } else {
        pngBytes = await fetchImageBytes(template.fileUrl);
      }

      const activeCalibration = template.calibration || DEFAULT_CALIBRATION;

      // 2. Ultra-fast parallel batch generator with atomic batch sequence, preloaded image, and non-blocking Firestore storage
      const runResults = await generateCertificateBatch({
        students: studentsToProcess,
        masterPngBytes: pngBytes,
        template,
        calibration: activeCalibration,
        onProgress: (progress) => {
          setGenerationProgress(progress);
        },
      });

      setGeneratedRunRecords(runResults);
      await fetchDatabaseCertificates();
      success(
        'Certificates Generated',
        `Successfully generated and persisted ${runResults.length} high-resolution certificate${runResults.length > 1 ? 's' : ''} in the main database.`
      );

      // If single student generated, open preview immediately with Print and Download options
      if (runResults.length === 1) {
        setViewingCertificate(runResults[0]);
      }

      // Scroll to results section
      setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err) {
      console.error('Certificate generation error:', err);
      error('Generation Error', err instanceof Error ? err.message : 'An error occurred during certificate generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Print single certificate (Direct print window, immune to Chrome iframe blocking)
  const handlePrintCertificate = async (item: {
    studentName: string;
    certificateNumber: string;
    pdfBytes?: Uint8Array;
    previewUrl?: string;
    fileUrl?: string;
  }) => {
    try {
      let previewSrc = item.previewUrl;
      if (!previewSrc && item.fileUrl && !item.fileUrl.endsWith('.pdf')) {
        previewSrc = item.fileUrl;
      }
      if (!previewSrc && template) {
        let pngBytes: Uint8Array;
        if (templateFile) {
          pngBytes = new Uint8Array(await templateFile.arrayBuffer());
        } else if (template.fileUrl) {
          pngBytes = await fetchImageBytes(template.fileUrl);
        } else {
          throw new Error('Template image not ready');
        }
        previewSrc = await renderCertificatePreviewDataUrl({
          masterPngBytes: pngBytes,
          studentName: item.studentName,
          certificateNumber: item.certificateNumber,
          calibration: template.calibration || DEFAULT_CALIBRATION,
        });
      }

      if (!previewSrc) {
        error('Print Error', 'Certificate preview not available for printing.');
        return;
      }

      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert('Please allow popups to enable printing.');
        return;
      }

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Print Certificate - ${item.certificateNumber} - ${item.studentName}</title>
            <style>
              @page {
                size: landscape;
                margin: 0;
              }
              *, *::before, *::after {
                box-sizing: border-box;
              }
              html, body {
                margin: 0;
                padding: 0;
                width: 100vw;
                height: 100vh;
                background-color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
              }
              img {
                max-width: 100vw;
                max-height: 100vh;
                width: auto;
                height: auto;
                object-fit: contain;
                display: block;
              }
            </style>
          </head>
          <body>
            <img src="${previewSrc}" alt="Certificate" onload="window.focus(); setTimeout(function() { window.print(); }, 250);" />
          </body>
        </html>
      `);
      printWin.document.close();
      success('Print Initiated', `Opening print preview for ${item.studentName}`);
    } catch (err) {
      console.error('Print Error:', err);
      error('Print Error', 'Could not open print preview.');
    }
  };

  // Download single certificate PDF
  const handleDownloadSingle = (item: {
    studentName: string;
    certificateNumber: string;
    pdfBytes?: Uint8Array;
    fileUrl?: string;
  }) => {
    try {
      if (item.pdfBytes) {
        const blob = new Blob([item.pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.certificateNumber}_${item.studentName.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 150);
        success('Download Started', `Downloading certificate for ${item.studentName}`);
      } else if (item.fileUrl) {
        window.open(item.fileUrl, '_blank');
      }
    } catch (err) {
      error('Download Failed', 'Could not download certificate PDF.');
    }
  };

  // Print all generated certificates (Direct print window with page breaks, immune to Chrome iframe blocking)
  const handlePrintAll = async () => {
    if (generatedRunRecords.length === 0) return;
    if (generatedRunRecords.length === 1) {
      handlePrintCertificate(generatedRunRecords[0]);
      return;
    }

    try {
      const imagesHtml = generatedRunRecords
        .map(
          (rec) => `
          <div class="cert-page">
            <img src="${rec.previewUrl || ''}" alt="Certificate ${rec.certificateNumber}" />
          </div>
        `
        )
        .join('');

      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert('Please allow popups to enable printing.');
        return;
      }

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Print All Certificates (${generatedRunRecords.length})</title>
            <style>
              @page {
                size: landscape;
                margin: 0;
              }
              *, *::before, *::after {
                box-sizing: border-box;
              }
              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
              }
              .cert-page {
                width: 100vw;
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                page-break-after: always;
                break-after: page;
                overflow: hidden;
              }
              img {
                max-width: 100vw;
                max-height: 100vh;
                width: auto;
                height: auto;
                object-fit: contain;
                display: block;
              }
            </style>
          </head>
          <body>
            ${imagesHtml}
            <script>
              window.focus();
              setTimeout(function() { window.print(); }, 350);
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
      success('Print Ready', `Prepared all ${generatedRunRecords.length} certificates for printing.`);
    } catch (err) {
      console.error('Print All Error:', err);
      error('Print Error', 'Could not prepare print job.');
    }
  };

  // View certificate loaded from the Firestore main database
  const handleViewDatabaseCertificate = async (record: CertificateRecord) => {
    const cached = generatedRunRecords.find((r) => r.certificateNumber === record.certificateNumber);
    if (cached) {
      setViewingCertificate(cached);
      return;
    }

    try {
      let pngBytes: Uint8Array | null = null;
      if (templateFile) {
        pngBytes = new Uint8Array(await templateFile.arrayBuffer());
      } else if (template?.fileUrl) {
        pngBytes = await fetchImageBytes(template.fileUrl);
      }

      let pdfBytes: Uint8Array | undefined;
      let previewUrl: string | undefined;

      if (pngBytes) {
        const calibration = template?.calibration || DEFAULT_CALIBRATION;
        const res = await generateSingleCertificatePdf({
          masterPngBytes: pngBytes,
          studentName: record.studentName,
          certificateNumber: record.certificateNumber,
          calibration,
        });
        pdfBytes = res.pdfBytes;
        previewUrl = await renderCertificatePreviewDataUrl({
          masterPngBytes: pngBytes,
          studentName: record.studentName,
          certificateNumber: record.certificateNumber,
          calibration,
        });
      }

      setViewingCertificate({
        studentName: record.studentName,
        certificateNumber: record.certificateNumber,
        pdfBytes,
        previewUrl,
        fileUrl: record.fileUrl,
        generatedDate: new Date(record.createdAt || record.generatedAt || Date.now()).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      });
    } catch (err) {
      console.error('Error opening certificate preview:', err);
      error('Preview Error', 'Could not render certificate preview.');
    }
  };

  // Download All as ZIP
  const handleDownloadAllZip = async () => {
    if (generatedRunRecords.length === 0) {
      error('No Certificates', 'No certificates have been generated in this session yet.');
      return;
    }
    try {
      await downloadCertificatesAsZip(generatedRunRecords, 'Codeneksa_Official_Certificates.zip');
      success('ZIP Downloaded', 'Packaged all certificates into ZIP file.');
    } catch (err) {
      error('ZIP Error', err instanceof Error ? err.message : 'Could not create ZIP archive.');
    }
  };

  const isReadyToGenerate =
    Boolean(template?.fileUrl) &&
    Boolean(studentValidation && studentValidation.validStudents.length > 0) &&
    !isGenerating;

  // Check admin role
  const isAdmin = userProfile ? userProfile.role === 'admin' : true;

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Certificate Employee is restricted to authorized administrators only. You do not have permission to upload master templates or issue accredited certificates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans selection:bg-indigo-500/20">
      {/* Hidden File Inputs */}
      <input
        ref={templateInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/*,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleTemplateFileSelect(file);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={studentInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleSpreadsheetSelect(file);
          }
          e.target.value = '';
        }}
      />

      {/* Top Banner Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Header Title & Subtitle */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-wider text-sm">CODENEKSA</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 text-xs font-bold border border-amber-500/20">
                Certificate Employee
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Create student certificates using your official certificate template and student data.
            </p>
          </div>

          {/* Top-Right Secondary Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCalibrationOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-300 font-semibold"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Calibrate Name Position</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => databaseSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-1.5 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-300 font-semibold"
            >
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span>Database Records ({issuedDatabaseRecords.length})</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border-slate-200 hover:bg-slate-100"
              title="Reset current workspace selection"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Page Container */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        {/* ========================================================================= */}
        {/* TWO PRIMARY INPUT OPTIONS: SIDE-BY-SIDE CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OPTION 1: Master Certificate Template */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Certificate Template</span>
                </h2>
                {template && (
                  <button
                    onClick={() => {
                      setTemplate(null);
                      setTemplateFile(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Upload the official Codeneksa certificate PNG that will be used as the master artwork.
              </p>

              {template?.fileUrl ? (
                /* Uploaded Template Preview Box */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingTemplate(true);
                  }}
                  onDragLeave={() => setIsDraggingTemplate(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingTemplate(false);
                    if (e.dataTransfer.files?.[0]) handleTemplateFileSelect(e.dataTransfer.files[0]);
                  }}
                  className={`bg-slate-50 border rounded-2xl p-4 flex items-center gap-4 transition-all ${
                    isDraggingTemplate
                      ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div
                    onClick={() => templateInputRef.current?.click()}
                    className="w-24 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 shadow-2xs cursor-pointer hover:opacity-90 relative group"
                    title="Click to replace PNG template"
                  >
                    <img
                      src={template.fileUrl}
                      alt="Certificate Template Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                      Replace
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Master template enabled & active</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate mt-1">
                      {template.fileName || 'CERTIFICATES ORIGINAL.png'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {template.imageWidth || 2000} × {template.imageHeight || 1414} px • PNG master
                    </div>
                  </div>
                </div>
              ) : (
                /* Drag and drop upload area */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingTemplate(true);
                  }}
                  onDragLeave={() => setIsDraggingTemplate(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingTemplate(false);
                    if (e.dataTransfer.files?.[0]) handleTemplateFileSelect(e.dataTransfer.files[0]);
                  }}
                  onClick={() => templateInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                    isDraggingTemplate
                      ? 'border-amber-500 bg-amber-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {isUploadingTemplate ? 'Uploading Master PNG...' : 'Upload Master PNG'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Drag & drop or browse • PNG files only
                  </p>
                </div>
              )}
            </div>

            {/* Template Actions */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => templateInputRef.current?.click()}
                disabled={isUploadingTemplate}
                className="flex-1 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {template ? 'Replace Template' : 'Upload Master PNG'}
              </Button>

              {template && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="flex-1 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  View Template
                </Button>
              )}

              {!template && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadDefaultTemplate}
                  disabled={isUploadingTemplate}
                  className="text-xs text-amber-700 hover:bg-amber-50"
                  title="Initialize with official Codeneksa artwork (2000x1414 px)"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Load Official Artwork
                </Button>
              )}
            </div>
          </div>

          {/* OPTION 2: Student Data */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Student Data</span>
                </h2>
                {studentValidation && (
                  <button
                    onClick={() => {
                      setStudentValidation(null);
                      setRawUploadedFile(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Upload an Excel or CSV file to extract student names for certificate generation.
              </p>

              {studentValidation ? (
                /* Uploaded Data Preview Box */
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {studentValidation.fileName}
                      </span>
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {studentValidation.validStudents.length} Students
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                      <span className="text-emerald-600 font-semibold">
                        ✓ {studentValidation.validStudents.length} valid students
                      </span>
                      {studentValidation.skippedRows.length > 0 && (
                        <span className="text-amber-600">
                          ⚠ {studentValidation.skippedRows.length} rows skipped
                        </span>
                      )}
                      {studentValidation.duplicateCount > 0 && (
                        <span className="text-rose-600">
                          ⚠ {studentValidation.duplicateCount} duplicate names
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Drop area */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingStudent(true);
                  }}
                  onDragLeave={() => setIsDraggingStudent(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingStudent(false);
                    if (e.dataTransfer.files?.[0]) handleSpreadsheetSelect(e.dataTransfer.files[0]);
                  }}
                  onClick={() => studentInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                    isDraggingStudent
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {isParsingSpreadsheet ? 'Reading Spreadsheet...' : 'Drop Excel or CSV file here'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Supports .xlsx and .csv</p>
                </div>
              )}
            </div>

            {/* Student Upload Actions */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => studentInputRef.current?.click()}
                disabled={isParsingSpreadsheet}
                className="flex-1 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload Student Data
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSingleDemoStudent}
                disabled={isParsingSpreadsheet}
                className="text-xs border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100/60 font-semibold"
                title="Load 1 demo student to verify how certificate printing looks"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Demo Student (Verify Print)
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN SELECTION IF NOT DETECTED */}
        {/* ========================================================================= */}
        {studentValidation && !studentValidation.detectedNameColumn && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Student name column not found.</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Select which column represents the student full name to extract:
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-900 font-semibold">Select Student Name Column:</span>
              <select
                value={selectedNameCol}
                onChange={(e) => setSelectedNameCol(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-amber-300 bg-white text-slate-800 font-semibold focus:outline-hidden"
              >
                <option value="">Select Column...</option>
                {studentValidation.columnsFound.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyColumnSelection}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STUDENT DATA PREVIEW */}
        {/* ========================================================================= */}
        {studentValidation && studentValidation.validStudents.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Student Data Loaded
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {studentValidation.validStudents.length} students found in {studentValidation.fileName}
                </p>
              </div>

              {/* Validation summary chips matching requirement */}
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  ✓ {studentValidation.validStudents.length} valid students
                </span>
                {studentValidation.skippedRows.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                    ⚠ {studentValidation.skippedRows.length} rows skipped
                  </span>
                )}
                {studentValidation.duplicateCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                    ⚠ {studentValidation.duplicateCount} duplicate names
                  </span>
                )}
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3 w-16">#</th>
                    <th className="px-6 py-3">Student Name</th>
                    <th className="px-6 py-3">College / Course</th>
                    <th className="px-6 py-3 text-right">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentValidation.validStudents.slice(0, 50).map((st, idx) => (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-2.5 font-mono text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-6 py-2.5 font-bold text-slate-900">{st.name}</td>
                      <td className="px-6 py-2.5 text-slate-500">
                        {st.college ? `${st.college} • ${st.course || 'Certificate'}` : 'Codeneksa EdTech'}
                      </td>
                      <td className="px-6 py-2.5 text-right">
                        {st.isDuplicate ? (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Duplicate Name
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Valid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {studentValidation.validStudents.length > 50 && (
                <div className="py-2.5 text-center bg-slate-50 text-xs text-slate-500 border-t border-slate-200">
                  Showing first 50 of {studentValidation.validStudents.length} students.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONE LARGE PRIMARY ACTION: GENERATE CERTIFICATES */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 text-center space-y-4">
          {/* Status guidance */}
          {(!template || !studentValidation || studentValidation.validStudents.length === 0) && (
            <div className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Upload a master certificate template and student data to continue.
            </div>
          )}

          {/* Large Primary Action Button */}
          <div className="max-w-md mx-auto">
            <Button
              variant="primary"
              size="lg"
              disabled={!isReadyToGenerate}
              onClick={handleOpenGenerationPreview}
              className={`w-full py-4 text-base font-extrabold tracking-wide uppercase shadow-lg transition-all rounded-2xl flex items-center justify-center gap-2 ${
                isReadyToGenerate
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/25 active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Award className="w-5 h-5" />
              <span>
                {isGenerating
                  ? `Generating (${generationProgress.current} / ${generationProgress.total})...`
                  : 'GENERATE CERTIFICATES'}
              </span>
            </Button>
          </div>

          {/* Progress Bar during generation */}
          {isGenerating && (
            <div className="max-w-md mx-auto space-y-2 pt-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Generating Certificates</span>
                <span>
                  {generationProgress.current} of {generationProgress.total} completed
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      (generationProgress.current / (generationProgress.total || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Current: <strong className="text-slate-700">{generationProgress.currentName}</strong>
              </p>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* GENERATED CERTIFICATES OUTPUT SECTION */}
        {/* ========================================================================= */}
        {generatedRunRecords.length > 0 && (
          <div
            ref={resultsSectionRef}
            className="bg-white rounded-3xl border border-emerald-200 shadow-sm p-6 space-y-5 animate-fadeIn scroll-mt-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Certificates Generated Successfully
                  </h3>
                  <p className="text-xs text-slate-500">
                    ✓ {generatedRunRecords.length} certificate{generatedRunRecords.length > 1 ? 's' : ''} generated • Print, View, or Download enabled below
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintAll}
                  className="text-xs border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold"
                  title="Print all generated certificates"
                >
                  <Printer className="w-3.5 h-3.5 mr-1 text-purple-600" />
                  Print All ({generatedRunRecords.length})
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadAllZip}
                  className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  title="Download all certificates in ZIP archive"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download All as ZIP</span>
                </Button>
              </div>
            </div>

            {/* Generated Items Table with Student Name, Certificate Number, Generated Date, Actions */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Certificate Number</th>
                    <th className="px-4 py-3">Generated Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {generatedRunRecords.map((item) => (
                    <tr key={item.certificateNumber} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.studentName}</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                        {item.certificateNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.generatedDate}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handlePrintCertificate(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Print Certificate"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingCertificate(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="View Full Certificate Preview"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Download Certificate PDF"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PERSISTENT MAIN DATABASE CERTIFICATES SECTION */}
        {/* ========================================================================= */}
        <div
          ref={databaseSectionRef}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5 scroll-mt-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Issued Certificates in Main Database
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {issuedDatabaseRecords.length} Saved
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ✓ Persisted securely in Firestore database • Data is permanently preserved
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by student or cert #..."
                  value={databaseSearchQuery}
                  onChange={(e) => setDatabaseSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-56 sm:w-64"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchDatabaseCertificates}
                disabled={isLoadingDatabase}
                className="text-xs text-slate-600 border-slate-200 hover:bg-slate-50 font-semibold"
                title="Refresh database records"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 text-slate-500 ${isLoadingDatabase ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Database Records Table */}
          {isLoadingDatabase ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              Loading persistent certificates from main database...
            </div>
          ) : issuedDatabaseRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No certificates issued yet. Upload your template and student list above to generate and store records.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Certificate Number</th>
                      <th className="px-4 py-3">Course / College</th>
                      <th className="px-4 py-3">Issued Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {issuedDatabaseRecords
                      .filter((r) => {
                        const q = databaseSearchQuery.toLowerCase();
                        return (
                          !q ||
                          r.studentName?.toLowerCase().includes(q) ||
                          r.certificateNumber?.toLowerCase().includes(q) ||
                          r.courseProgram?.toLowerCase().includes(q)
                        );
                      })
                      .map((item) => (
                        <tr key={item.id || item.certificateNumber} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">{item.studentName}</td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                            {item.certificateNumber}
                          </td>
                          <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]">
                            {item.courseProgram || item.collegeName || 'Certification Course'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(item.createdAt || item.generatedAt || Date.now()).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Issued
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handlePrintCertificate(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all cursor-pointer active:scale-95"
                                title="Print Certificate"
                              >
                                <Printer className="w-3.5 h-3.5" /> Print
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewDatabaseCertificate(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
                                title="View Certificate"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadSingle(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer active:scale-95"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" /> Download
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* READY TO GENERATE CONFIRMATION PREVIEW MODAL */}
      {/* ========================================================================= */}
      {isReadyToGenerateModalOpen && template && studentValidation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Ready to Generate</h3>
              <button
                onClick={() => setIsReadyToGenerateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Template:</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">
                  {template.fileName || 'CERTIFICATES ORIGINAL.png'}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Students:</span>
                <span className="font-bold text-slate-900">
                  {studentValidation.totalRows}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Valid Names:</span>
                <span className="font-bold text-emerald-700">
                  {studentValidation.validStudents.length}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-slate-500 font-medium">Skipped:</span>
                <span className="font-bold text-amber-700">
                  {studentValidation.skippedRows.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsReadyToGenerateModalOpen(false)}
                className="flex-1 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleGenerateCertificates}
                className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Generate Certificates
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate In-App Viewer Modal */}
      <CertificateViewerModal
        isOpen={Boolean(viewingCertificate)}
        onClose={() => setViewingCertificate(null)}
        certificate={viewingCertificate}
        onPrint={handlePrintCertificate}
        onDownload={handleDownloadSingle}
      />

      {/* Calibration Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        template={template}
        onSaved={(newCalibration) => {
          if (template) {
            setTemplate({ ...template, calibration: newCalibration });
          }
        }}
      />

      {/* Master Template Preview Modal */}
      <TemplatePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        template={template}
      />
    </div>
  );
};

