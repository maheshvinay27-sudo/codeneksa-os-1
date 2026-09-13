import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  Building2,
  BookOpen,
  FolderKanban,
  Check,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  Users,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useNotification } from '../../context/NotificationContext';
import {
  parseStudentDataFile,
  autoDetectColumnMapping,
  validateStudentData,
  generateNextBatchId,
  fetchCollegesList,
  fetchCoursesList,
  createCollegeInline,
  createCourseInline,
  executeBatchImport,
  generateSampleCsvContent,
  downloadSampleExcelTemplate,
  FileParseResult,
} from '../../services/dataEmployeeService';
import {
  ColumnMappingConfig,
  ParsedStudentRow,
  ValidationSummary,
  ImportProgress,
  ImportResult,
  College,
  Course,
} from '../../types';

interface DataEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (result: ImportResult) => void;
  onViewBatch?: (batchId: string) => void;
  onViewStudents?: () => void;
}

type WizardStep = 'upload' | 'mapping' | 'validation' | 'importing' | 'result';

export const DataEmployeeModal: React.FC<DataEmployeeModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onViewBatch,
  onViewStudents,
}) => {
  const { success, error, info } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard State
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parsed File State
  const [parsedData, setParsedData] = useState<FileParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMappingConfig>({
    name: '',
    hallTicketNumber: '',
    email: '',
    phone: '',
    college: '',
    course: '',
  });
  const [mappingConfidence, setMappingConfidence] = useState<Record<string, string>>({});
  const [showManualMapping, setShowManualMapping] = useState<boolean>(false);

  // Validation State
  const [validatedRows, setValidatedRows] = useState<ParsedStudentRow[]>([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [validationFilter, setValidationFilter] = useState<'all' | 'valid' | 'attention' | 'invalid'>('all');
  const [skipInvalidRecords, setSkipInvalidRecords] = useState<boolean>(true);

  // Batch Configuration State
  const [batchId, setBatchId] = useState<string>('');
  const [batchName, setBatchName] = useState<string>('');
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [selectedCollegeName, setSelectedCollegeName] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedCourseTitle, setSelectedCourseTitle] = useState<string>('');

  // Inline Creation State
  const [showNewCollegeInput, setShowNewCollegeInput] = useState<boolean>(false);
  const [newCollegeName, setNewCollegeName] = useState<string>('');
  const [newCollegeCode, setNewCollegeCode] = useState<string>('');
  const [showNewCourseInput, setShowNewCourseInput] = useState<boolean>(false);
  const [newCourseTitle, setNewCourseTitle] = useState<string>('');
  const [newCourseCode, setNewCourseCode] = useState<string>('');

  // Institution & Course Lists
  const [collegesList, setCollegesList] = useState<College[]>([]);
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [loadingAcademicData, setLoadingAcademicData] = useState<boolean>(false);

  // Import Progress & Result State
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    statusMessage: '',
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Initialize or reset wizard when modal opens
  useEffect(() => {
    if (isOpen) {
      resetWizard();
      loadAcademicData();
    }
  }, [isOpen]);

  const loadAcademicData = async () => {
    setLoadingAcademicData(true);
    try {
      const [colleges, courses] = await Promise.all([
        fetchCollegesList(),
        fetchCoursesList(),
      ]);
      setCollegesList(colleges);
      setCoursesList(courses);
    } catch (err) {
      console.warn('Error loading colleges or courses:', err);
    } finally {
      setLoadingAcademicData(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep('upload');
    setParsedData(null);
    setParseError(null);
    setMapping({
      name: '',
      hallTicketNumber: '',
      email: '',
      phone: '',
      college: '',
      course: '',
    });
    setShowManualMapping(false);
    setValidatedRows([]);
    setValidationSummary(null);
    setValidationFilter('all');
    setBatchId('');
    setBatchName('');
    setSelectedCollegeId('');
    setSelectedCollegeName('');
    setSelectedCourseId('');
    setSelectedCourseTitle('');
    setShowNewCollegeInput(false);
    setNewCollegeName('');
    setNewCollegeCode('');
    setShowNewCourseInput(false);
    setNewCourseTitle('');
    setNewCourseCode('');
    setImportResult(null);
    setIsImporting(false);
  };

  // Step 1: File Selection & Parsing
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsParsing(true);
    setParseError(null);

    try {
      const parsed = await parseStudentDataFile(file);
      setParsedData(parsed);

      // Auto detect column mapping
      const { mapping: detectedMapping, confidence, isConfident } = autoDetectColumnMapping(parsed.headers);
      setMapping(detectedMapping);
      setMappingConfidence(confidence);

      // If confidence is low or name wasn't detected, open manual mapping view directly
      if (!isConfident || !detectedMapping.name) {
        setShowManualMapping(true);
      }

      // Generate next sequential batch ID from Firestore
      const nextId = await generateNextBatchId();
      setBatchId(nextId);

      // Default Batch Name auto-suggestion
      const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const baseFileName = file.name.replace(/\.[^/.]+$/, '');
      setBatchName(`${baseFileName} — Cohort (${currentMonth})`);

      // Advance to Mapping step
      setCurrentStep('mapping');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse student data file.';
      setParseError(msg);
      error('File Processing Failed', msg);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Download sample templates
  const handleDownloadExcel = () => {
    try {
      downloadSampleExcelTemplate();
      info('Excel Template Downloaded', 'Official Codeneksa Student Excel template (.xlsx) downloaded.');
    } catch (err) {
      // Fallback to static asset link
      const link = document.createElement('a');
      link.href = '/codeneksa_student_template.xlsx';
      link.setAttribute('download', 'codeneksa_student_template.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadSample = () => {
    const sampleCsv = generateSampleCsvContent();
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'codeneksa_student_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    info('Sample Template Downloaded', 'Use this format for flawless batch importing.');
  };

  // Step 2 -> Step 3: Run Validation & Prepare Batch Setup
  const handleProceedToValidation = () => {
    if (!parsedData) return;

    if (!mapping.name) {
      error('Column Mapping Required', 'You must map the Student Name column (mandatory field).');
      setShowManualMapping(true);
      return;
    }

    // Run validation on all rows
    const { rows, summary } = validateStudentData(parsedData.rawRows, mapping, parsedData.headers);
    setValidatedRows(rows);
    setValidationSummary(summary);

    // Auto-detect college or course from mapped rows if available
    const firstCollegeValue = rows.find((r) => r.mapped.college)?.mapped.college;
    if (firstCollegeValue && !selectedCollegeId) {
      const existing = collegesList.find(
        (c) => c.name.toLowerCase() === firstCollegeValue.toLowerCase()
      );
      if (existing) {
        setSelectedCollegeId(existing.id);
        setSelectedCollegeName(existing.name);
      } else {
        setNewCollegeName(firstCollegeValue);
        setNewCollegeCode(
          firstCollegeValue
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 6)
        );
      }
    }

    const firstCourseValue = rows.find((r) => r.mapped.course)?.mapped.course;
    if (firstCourseValue && !selectedCourseId) {
      const existingCourse = coursesList.find(
        (c) => c.title.toLowerCase() === firstCourseValue.toLowerCase()
      );
      if (existingCourse) {
        setSelectedCourseId(existingCourse.id);
        setSelectedCourseTitle(existingCourse.title);
      } else {
        setNewCourseTitle(firstCourseValue);
        setNewCourseCode(
          firstCourseValue
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 6)
        );
      }
    }

    setCurrentStep('validation');
  };

  // Step 4: Execute Import
  const handleStartImport = async () => {
    if (!parsedData || !validationSummary) return;

    if (!batchName.trim()) {
      error('Batch Name Required', 'Please enter a name for this cohort batch.');
      return;
    }

    // Handle College selection or creation
    let finalCollegeId = selectedCollegeId;
    let finalCollegeName = selectedCollegeName;

    if (showNewCollegeInput || !finalCollegeId) {
      if (!newCollegeName.trim()) {
        error('College Required', 'Please select an existing college or provide a new college name.');
        return;
      }
      try {
        finalCollegeId = await createCollegeInline(newCollegeName, newCollegeCode || 'COLLEGE');
        finalCollegeName = newCollegeName.trim();
      } catch (err: unknown) {
        error('College Creation Failed', err instanceof Error ? err.message : 'Could not create college.');
        return;
      }
    }

    // Handle Course selection or creation
    let finalCourseId = selectedCourseId;
    let finalCourseTitle = selectedCourseTitle;

    if (showNewCourseInput || !finalCourseId) {
      if (!newCourseTitle.trim()) {
        error('Course Required', 'Please select an existing course or provide a new course title.');
        return;
      }
      try {
        finalCourseId = await createCourseInline(newCourseTitle, newCourseCode || 'COURSE');
        finalCourseTitle = newCourseTitle.trim();
      } catch (err: unknown) {
        error('Course Creation Failed', err instanceof Error ? err.message : 'Could not create course.');
        return;
      }
    }

    // Filter records according to operator preference
    const recordsToImport = skipInvalidRecords
      ? validatedRows.filter((r) => r.validationStatus !== 'invalid')
      : validatedRows;

    if (recordsToImport.length === 0) {
      error('No Records To Import', 'All records have validation errors. Fix mappings or review data.');
      return;
    }

    setCurrentStep('importing');
    setIsImporting(true);

    try {
      const result = await executeBatchImport({
        batchId: batchId || `BATCH-${Date.now()}`,
        batchName: batchName.trim(),
        collegeId: finalCollegeId,
        collegeName: finalCollegeName,
        courseId: finalCourseId,
        courseTitle: finalCourseTitle,
        sourceFileName: parsedData.fileName,
        records: recordsToImport,
        onProgress: (prog) => {
          setImportProgress(prog);
        },
      });

      setImportResult(result);
      setCurrentStep('result');
      success('Import Succeeded', `${result.importedCount} student records saved to Cloud Firestore.`);
      onImportSuccess?.(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed due to network or permissions.';
      error('Import Error', msg);
      setCurrentStep('validation');
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered rows for the preview table
  const displayRows = validatedRows.filter((r) => {
    if (validationFilter === 'valid') return r.validationStatus === 'valid';
    if (validationFilter === 'attention') return r.validationStatus === 'attention';
    if (validationFilter === 'invalid') return r.validationStatus === 'invalid';
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isImporting) onClose();
      }}
      title=""
      description=""
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 select-none -mt-3">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">THE DATA EMPLOYEE</h3>
                <Badge variant="purple" size="sm">
                  Codeneksa OS Phase 2
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated Student Spreadsheet Ingestion, Column Mapping, and Cloud Firestore Batch Initialization
              </p>
            </div>
          </div>

          {/* Step Progress Pill */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className={currentStep === 'upload' ? 'text-indigo-400 font-bold' : ''}>1. Upload</span>
            <span>→</span>
            <span className={currentStep === 'mapping' ? 'text-indigo-400 font-bold' : ''}>2. Mapping</span>
            <span>→</span>
            <span className={currentStep === 'validation' ? 'text-indigo-400 font-bold' : ''}>3. Validate</span>
            <span>→</span>
            <span className={currentStep === 'importing' || currentStep === 'result' ? 'text-indigo-400 font-bold' : ''}>
              4. Import
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: UPLOAD                                                            */}
        {/* ========================================================================= */}
        {currentStep === 'upload' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs text-slate-300 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-semibold text-indigo-300">
                  Upload a student data file to create a new batch cohort.
                </p>
                <p className="text-slate-400 text-[11px]">
                  Supports Excel (.xlsx, .xls) and CSV (.csv). Files are parsed client-side in memory for security and previewed before committing any writes to Cloud Firestore.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadExcel}
                  className="text-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Excel Template (.xlsx)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSample}
                  className="text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  CSV
                </Button>
              </div>
            </div>

            {/* Drag and drop upload zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <LoadingSpinner size="lg" />
                  <p className="text-xs font-semibold text-slate-200">
                    Reading spreadsheet and analyzing columns...
                  </p>
                  <p className="text-[11px] text-slate-500">Checking headers and detecting patterns</p>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">
                    Drag and drop your spreadsheet here, or{' '}
                    <span className="text-indigo-400 hover:underline">browse</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepts CSV (.csv) and Microsoft Excel (.xlsx, .xls) up to 15MB
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-500 font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">.CSV</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">.XLSX</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">.XLS</span>
                  </div>
                </>
              )}
            </div>

            {parseError && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: COLUMN MAPPING                                                    */}
        {/* ========================================================================= */}
        {currentStep === 'mapping' && parsedData && (
          <div className="space-y-5">
            {/* File info banner */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="font-semibold text-slate-200">{parsedData.fileName}</span>
                  <span className="text-slate-500 ml-2">
                    ({parsedData.totalRawRows} rows • {(parsedData.fileSize / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualMapping(!showManualMapping)}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  {showManualMapping ? 'Hide Custom Mapping' : 'Adjust Mapping'}
                </Button>
              </div>
            </div>

            {/* Confidence summary badge */}
            {!showManualMapping && mapping.name && (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Column headers were recognized automatically</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 mt-2">
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Student Name:</span>
                    <span className="font-mono text-emerald-400">{mapping.name || '—'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Hall Ticket:</span>
                    <span className="font-mono text-indigo-300">{mapping.hallTicketNumber || 'Not specified'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Email Address:</span>
                    <span className="font-mono text-indigo-300">{mapping.email || 'Not specified'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Phone Number:</span>
                    <span className="font-mono text-slate-300">{mapping.phone || 'Not specified'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">College:</span>
                    <span className="font-mono text-slate-300">{mapping.college || 'From Batch config'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Course:</span>
                    <span className="font-mono text-slate-300">{mapping.course || 'From Batch config'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Mapping Interface */}
            {showManualMapping && (
              <div className="space-y-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Confirm Column Mappings
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Map each standard Codeneksa field to your file&apos;s columns
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Student Name */}
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Student Name <span className="text-rose-400">* (Mandatory)</span>
                      </label>
                      {mapping.name ? (
                        <span className="text-[10px] text-emerald-400 font-mono">Mapped</span>
                      ) : (
                        <span className="text-[10px] text-rose-400 font-mono">Required</span>
                      )}
                    </div>
                    <select
                      value={mapping.name}
                      onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">— Select Column from File —</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {mapping.name && parsedData.rawRows[0] && (
                      <p className="text-[10px] text-slate-400 truncate">
                        Sample: &quot;{String(parsedData.rawRows[0][mapping.name] ?? '')}&quot;
                      </p>
                    )}
                  </div>

                  {/* Hall Ticket Number */}
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Hall Ticket / Roll No <span className="text-amber-400">(Recommended)</span>
                      </label>
                    </div>
                    <select
                      value={mapping.hallTicketNumber}
                      onChange={(e) => setMapping({ ...mapping, hallTicketNumber: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">— Not in file / Leave empty —</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {mapping.hallTicketNumber && parsedData.rawRows[0] && (
                      <p className="text-[10px] text-slate-400 truncate">
                        Sample: &quot;{String(parsedData.rawRows[0][mapping.hallTicketNumber] ?? '')}&quot;
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Email Address <span className="text-amber-400">(Recommended)</span>
                      </label>
                    </div>
                    <select
                      value={mapping.email}
                      onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">— Not in file / Leave empty —</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {mapping.email && parsedData.rawRows[0] && (
                      <p className="text-[10px] text-slate-400 truncate">
                        Sample: &quot;{String(parsedData.rawRows[0][mapping.email] ?? '')}&quot;
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">Phone Number</label>
                    </div>
                    <select
                      value={mapping.phone}
                      onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">— Not in file / Leave empty —</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {mapping.phone && parsedData.rawRows[0] && (
                      <p className="text-[10px] text-slate-400 truncate">
                        Sample: &quot;{String(parsedData.rawRows[0][mapping.phone] ?? '')}&quot;
                      </p>
                    )}
                  </div>

                  {/* College Column */}
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">College / Institution</label>
                    </div>
                    <select
                      value={mapping.college}
                      onChange={(e) => setMapping({ ...mapping, college: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">— Use Batch Selection —</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course Column */}
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">Course / Program</label>
                    </div>
                    <select
                      value={mapping.course}
                      onChange={(e) => setMapping({ ...mapping, course: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">— Use Batch Selection —</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep('upload')}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back to Upload
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleProceedToValidation}
                disabled={!mapping.name}
              >
                Validate & Setup Batch
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: VALIDATION & BATCH SETUP                                          */}
        {/* ========================================================================= */}
        {currentStep === 'validation' && validationSummary && (
          <div className="space-y-5">
            {/* Validation Tally Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Records</span>
                <span className="text-lg font-black text-slate-100 font-mono">
                  {validationSummary.totalRows}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/50">
                <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Valid Records
                </span>
                <span className="text-lg font-black text-emerald-300 font-mono">
                  {validationSummary.validCount}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/50">
                <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Needs Attention
                </span>
                <span className="text-lg font-black text-amber-300 font-mono">
                  {validationSummary.attentionCount}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/50">
                <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Invalid (Errors)
                </span>
                <span className="text-lg font-black text-rose-300 font-mono">
                  {validationSummary.invalidCount}
                </span>
              </div>
            </div>

            {/* Validation Breakdown Notices */}
            {(validationSummary.missingEmailCount > 0 ||
              validationSummary.duplicateHallTicketCount > 0 ||
              validationSummary.missingNameCount > 0 ||
              validationSummary.invalidEmailCount > 0) && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs space-y-1.5">
                <p className="font-semibold text-slate-300">Validation Breakdown:</p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {validationSummary.missingNameCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      ✕ {validationSummary.missingNameCount} records have no student name (cannot be imported)
                    </span>
                  )}
                  {validationSummary.missingEmailCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      ⚠ {validationSummary.missingEmailCount} records have missing email
                    </span>
                  )}
                  {validationSummary.duplicateHallTicketCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      ⚠ {validationSummary.duplicateHallTicketCount} duplicate hall tickets
                    </span>
                  )}
                  {validationSummary.invalidEmailCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      ⚠ {validationSummary.invalidEmailCount} invalid email format
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* BATCH INFORMATION FORM */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Batch Cohort Configuration
                  </h4>
                </div>
                <Badge variant="purple" size="sm">
                  {batchId}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* Batch Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batch Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g. ABC College — Full Stack Web Dev — September 2026"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-slate-600"
                  />
                </div>

                {/* College Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Partner College <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewCollegeInput(!showNewCollegeInput)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300"
                    >
                      {showNewCollegeInput ? 'Select Existing' : '+ New College'}
                    </button>
                  </div>

                  {showNewCollegeInput ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newCollegeName}
                        onChange={(e) => setNewCollegeName(e.target.value)}
                        placeholder="Enter new college name..."
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newCollegeCode}
                        onChange={(e) => setNewCollegeCode(e.target.value.toUpperCase())}
                        placeholder="Code (e.g. HIT-01)"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono uppercase focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <select
                      value={selectedCollegeId}
                      onChange={(e) => {
                        const col = collegesList.find((c) => c.id === e.target.value);
                        setSelectedCollegeId(e.target.value);
                        setSelectedCollegeName(col?.name || '');
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">— Select Registered College —</option>
                      {collegesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Course Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Curriculum Course <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewCourseInput(!showNewCourseInput)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300"
                    >
                      {showNewCourseInput ? 'Select Existing' : '+ New Course'}
                    </button>
                  </div>

                  {showNewCourseInput ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newCourseTitle}
                        onChange={(e) => setNewCourseTitle(e.target.value)}
                        placeholder="Enter course curriculum title..."
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newCourseCode}
                        onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())}
                        placeholder="Code (e.g. AI-201)"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono uppercase focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <select
                      value={selectedCourseId}
                      onChange={(e) => {
                        const crs = coursesList.find((c) => c.id === e.target.value);
                        setSelectedCourseId(e.target.value);
                        setSelectedCourseTitle(crs?.title || '');
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">— Select Curriculum Course —</option>
                      {coursesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Metadata details */}
                <div className="sm:col-span-2 pt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
                  <span>
                    Upload Source: <strong className="text-slate-200">{parsedData?.fileName}</strong>
                  </span>
                  <span>
                    Ready to Import:{' '}
                    <strong className="text-indigo-400 font-mono">
                      {skipInvalidRecords
                        ? validationSummary.validCount + validationSummary.attentionCount
                        : validationSummary.totalRows}{' '}
                      students
                    </strong>
                  </span>
                  <span>
                    Status: <span className="text-emerald-400 font-semibold">Ready for Import</span>
                  </span>
                </div>
              </div>
            </div>

            {/* PREVIEW TABLE WITH FILTER TABS */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setValidationFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      validationFilter === 'all'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({validationSummary.totalRows})
                  </button>
                  <button
                    onClick={() => setValidationFilter('valid')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      validationFilter === 'valid'
                        ? 'bg-emerald-600/30 text-emerald-300 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Valid ({validationSummary.validCount})
                  </button>
                  <button
                    onClick={() => setValidationFilter('attention')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      validationFilter === 'attention'
                        ? 'bg-amber-600/30 text-amber-300 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Attention ({validationSummary.attentionCount})
                  </button>
                  {validationSummary.invalidCount > 0 && (
                    <button
                      onClick={() => setValidationFilter('invalid')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        validationFilter === 'invalid'
                          ? 'bg-rose-600/30 text-rose-300 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Invalid ({validationSummary.invalidCount})
                    </button>
                  )}
                </div>

                {validationSummary.invalidCount > 0 && (
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipInvalidRecords}
                      onChange={(e) => setSkipInvalidRecords(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>Skip {validationSummary.invalidCount} invalid records during import</span>
                  </label>
                )}
              </div>

              {/* Data Table */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Hall Ticket</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {displayRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={
                          row.validationStatus === 'invalid'
                            ? 'bg-rose-950/20'
                            : row.validationStatus === 'attention'
                            ? 'bg-amber-950/10'
                            : 'hover:bg-slate-900/50'
                        }
                      >
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                          {row.rowIndex}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-100">
                          {row.mapped.name || (
                            <span className="text-rose-400 italic">Missing Name</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                          {row.mapped.hallTicketNumber || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                          {row.mapped.email || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                          {row.mapped.phone || '—'}
                        </td>
                        <td className="py-2 px-3">
                          {row.validationStatus === 'valid' && (
                            <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Valid
                            </span>
                          )}
                          {row.validationStatus === 'attention' && (
                            <span className="text-amber-400 text-[10px] font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {row.issues[0]?.message}
                            </span>
                          )}
                          {row.validationStatus === 'invalid' && (
                            <span className="text-rose-400 text-[10px] font-bold flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> {row.issues[0]?.message}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep('mapping')}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back to Mapping
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleStartImport}
                disabled={
                  !batchName.trim() ||
                  (!selectedCollegeId && !newCollegeName.trim()) ||
                  (!selectedCourseId && !newCourseTitle.trim())
                }
              >
                Import {skipInvalidRecords ? validationSummary.validCount + validationSummary.attentionCount : validationSummary.totalRows} Students
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: IMPORTING PROGRESS                                                */}
        {/* ========================================================================= */}
        {currentStep === 'importing' && (
          <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                <FolderKanban className="w-8 h-8" />
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-100">
                Writing Student Batch into Cloud Firestore
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {importProgress.statusMessage || 'Performing atomic chunked writes...'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md space-y-2">
              <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${importProgress.percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>
                  {importProgress.current} / {importProgress.total} records
                </span>
                <span>{importProgress.percentage}%</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: RESULT SCREEN                                                     */}
        {/* ========================================================================= */}
        {currentStep === 'result' && importResult && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-100 tracking-tight">IMPORT COMPLETE</h3>
              <p className="text-xs text-slate-400">
                The Data Employee has successfully processed and persisted the cohort in Cloud Firestore.
              </p>
            </div>

            {/* Result Information Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800/80 gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Batch Cohort</span>
                  <p className="text-sm font-bold text-slate-100">{importResult.batchName}</p>
                </div>
                <Badge variant="purple" size="md">
                  {importResult.batchId}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Processed</span>
                  <span className="text-base font-black text-slate-200 font-mono">
                    {importResult.totalProcessed}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Imported</span>
                  <span className="text-base font-black text-emerald-300 font-mono">
                    {importResult.importedCount}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Skipped</span>
                  <span className="text-base font-black text-slate-400 font-mono">
                    {importResult.skippedCount}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Errors</span>
                  <span className="text-base font-black text-slate-400 font-mono">
                    {importResult.errorCount}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Institution:</span>
                  <span className="text-slate-200 font-medium">{importResult.collegeName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Curriculum Course:</span>
                  <span className="text-slate-200 font-medium">{importResult.courseTitle}</span>
                </div>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetWizard();
                }}
              >
                Upload Another File
              </Button>

              {onViewStudents && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onViewStudents();
                  }}
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  View All Students
                </Button>
              )}

              {onViewBatch && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onViewBatch(importResult.batchId);
                  }}
                >
                  <FolderKanban className="w-3.5 h-3.5 mr-1.5" />
                  View Batch
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
