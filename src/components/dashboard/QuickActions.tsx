import React, { useState } from 'react';
import { Plus, Building2, BookOpen, FolderKanban, Activity, Check, Sparkles, UploadCloud, IdCard, Search, Mail, Award } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useNotification } from '../../context/NotificationContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { recordActivity } from '../../services/dashboardService';

interface QuickActionsProps {
  onDataChanged: () => void;
  onUploadStudentData?: () => void;
  onNavigateToStudentIdEmployee?: () => void;
  onNavigateToStudentSearch?: () => void;
  onNavigateToWelcomeMail?: () => void;
  onNavigateToCertificates?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onDataChanged,
  onUploadStudentData,
  onNavigateToStudentIdEmployee,
  onNavigateToStudentSearch,
  onNavigateToWelcomeMail,
  onNavigateToCertificates,
}) => {
  const { success, error } = useNotification();
  const [modalType, setModalType] = useState<'college' | 'course' | 'batch' | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // College form state
  const [collegeName, setCollegeName] = useState('');
  const [collegeCode, setCollegeCode] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');

  // Course form state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseDuration, setCourseDuration] = useState(3);

  // Batch form state
  const [batchName, setBatchName] = useState('');
  const [batchCode, setBatchCode] = useState('');

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeName.trim() || !collegeCode.trim()) {
      error('Validation Error', 'College name and institution code are required.');
      return;
    }

    setLoading(true);
    try {
      const nowStr = new Date().toISOString();
      await addDoc(collection(db, 'colleges'), {
        name: collegeName.trim(),
        code: collegeCode.trim().toUpperCase(),
        contactEmail: collegeEmail.trim() || '',
        active: true,
        createdAt: nowStr,
        updatedAt: nowStr,
      });

      await recordActivity({
        actionType: 'COLLEGE_ADDED',
        description: `College registered: ${collegeName.trim()} (${collegeCode.trim().toUpperCase()})`,
        category: 'academic',
      });

      success('College Registered', `${collegeName} has been saved to Cloud Firestore.`);
      setCollegeName('');
      setCollegeCode('');
      setCollegeEmail('');
      setModalType(null);
      onDataChanged();
    } catch (err: unknown) {
      error('Save Failed', err instanceof Error ? err.message : 'Permission denied or network issue.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim() || !courseCode.trim()) {
      error('Validation Error', 'Course title and course code are required.');
      return;
    }

    setLoading(true);
    try {
      const nowStr = new Date().toISOString();
      await addDoc(collection(db, 'courses'), {
        title: courseTitle.trim(),
        code: courseCode.trim().toUpperCase(),
        durationMonths: Number(courseDuration) || 3,
        active: true,
        createdAt: nowStr,
        updatedAt: nowStr,
      });

      await recordActivity({
        actionType: 'COURSE_CREATED',
        description: `Course created: ${courseTitle.trim()} [${courseCode.trim().toUpperCase()}]`,
        category: 'academic',
      });

      success('Course Created', `${courseTitle} registered successfully.`);
      setCourseTitle('');
      setCourseCode('');
      setModalType(null);
      onDataChanged();
    } catch (err: unknown) {
      error('Save Failed', err instanceof Error ? err.message : 'Could not save course.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim() || !batchCode.trim()) {
      error('Validation Error', 'Batch name and cohort code are required.');
      return;
    }

    setLoading(true);
    try {
      const nowStr = new Date().toISOString();
      await addDoc(collection(db, 'batches'), {
        name: batchName.trim(),
        code: batchCode.trim().toUpperCase(),
        courseId: 'general-curriculum',
        collegeId: 'main-campus',
        startDate: nowStr.split('T')[0],
        endDate: '',
        status: 'upcoming',
        createdAt: nowStr,
        updatedAt: nowStr,
      });

      await recordActivity({
        actionType: 'BATCH_CREATED',
        description: `Batch cohort initialized: ${batchName.trim()}`,
        category: 'academic',
      });

      success('Batch Created', `Cohort ${batchName} created in Firestore.`);
      setBatchName('');
      setBatchCode('');
      setModalType(null);
      onDataChanged();
    } catch (err: unknown) {
      error('Save Failed', err instanceof Error ? err.message : 'Could not save batch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Quick Actions"
          subtitle="Operational shortcuts for one-person digital administration"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {onUploadStudentData && (
            <button
              onClick={onUploadStudentData}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/70 to-slate-950/70 hover:from-indigo-900/60 hover:to-slate-900 border border-indigo-500/30 hover:border-indigo-500/50 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-200 group-hover:text-white">
                  Upload Data
                </p>
                <p className="text-[11px] text-slate-400">Data Employee</p>
              </div>
            </button>
          )}

          {onNavigateToStudentIdEmployee && (
            <button
              onClick={onNavigateToStudentIdEmployee}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/70 to-slate-950/70 hover:from-indigo-900/60 hover:to-slate-900 border border-indigo-500/30 hover:border-indigo-500/50 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <IdCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-200 group-hover:text-white">
                  Assign IDs
                </p>
                <p className="text-[11px] text-slate-400">Student ID Employee</p>
              </div>
            </button>
          )}

          {onNavigateToStudentSearch && (
            <button
              onClick={onNavigateToStudentSearch}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/70 to-slate-950/70 hover:from-indigo-900/60 hover:to-slate-900 border border-indigo-500/30 hover:border-indigo-500/50 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-200 group-hover:text-white">
                  Student Search
                </p>
                <p className="text-[11px] text-slate-400">Search Employee #4</p>
              </div>
            </button>
          )}

          {onNavigateToWelcomeMail && (
            <button
              id="btn-quick-action-welcome-mail"
              onClick={onNavigateToWelcomeMail}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/70 to-slate-950/70 hover:from-indigo-900/60 hover:to-slate-900 border border-indigo-500/30 hover:border-indigo-500/50 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-200 group-hover:text-white">
                  Welcome Mail
                </p>
                <p className="text-[11px] text-slate-400">Employee #5</p>
              </div>
            </button>
          )}

          {onNavigateToCertificates && (
            <button
              id="btn-quick-action-certificates"
              onClick={onNavigateToCertificates}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/70 to-slate-950/70 hover:from-indigo-900/60 hover:to-slate-900 border border-indigo-500/30 hover:border-indigo-500/50 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-200 group-hover:text-white">
                  Certificates
                </p>
                <p className="text-[11px] text-slate-400">Employee #6</p>
              </div>
            </button>
          )}

          <button
            onClick={() => setModalType('college')}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200 group-hover:text-white">Add College</p>
              <p className="text-[11px] text-slate-400">Register institution</p>
            </div>
          </button>

          <button
            onClick={() => setModalType('course')}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200 group-hover:text-white">Add Course</p>
              <p className="text-[11px] text-slate-400">Curriculum catalog</p>
            </div>
          </button>

          <button
            onClick={() => setModalType('batch')}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200 group-hover:text-white">Create Batch</p>
              <p className="text-[11px] text-slate-400">Initialize cohort</p>
            </div>
          </button>
        </div>
      </Card>

      {/* College Modal */}
      <Modal
        isOpen={modalType === 'college'}
        onClose={() => setModalType(null)}
        title="Register Partner College"
        description="Add a new college or university institution to the directory"
      >
        <form onSubmit={handleCreateCollege} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              College Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. Hyderabad Institute of Technology"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Institution Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={collegeCode}
                onChange={(e) => setCollegeCode(e.target.value.toUpperCase())}
                placeholder="e.g. HIT-01"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono uppercase focus:border-indigo-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contact Email</label>
              <input
                type="email"
                value={collegeEmail}
                onChange={(e) => setCollegeEmail(e.target.value)}
                placeholder="dean@institution.edu"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalType(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Save to Firestore
            </Button>
          </div>
        </form>
      </Modal>

      {/* Course Modal */}
      <Modal
        isOpen={modalType === 'course'}
        onClose={() => setModalType(null)}
        title="Add Course Curriculum"
        description="Register an EdTech course definition in Firestore"
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Course Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g. Full Stack Web Development with React"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Course Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                placeholder="e.g. FSWD-101"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono uppercase focus:border-indigo-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Duration (Months)</label>
              <input
                type="number"
                min="1"
                max="24"
                value={courseDuration}
                onChange={(e) => setCourseDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalType(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Create Course
            </Button>
          </div>
        </form>
      </Modal>

      {/* Batch Modal */}
      <Modal
        isOpen={modalType === 'batch'}
        onClose={() => setModalType(null)}
        title="Initialize Batch Cohort"
        description="Establish an active or upcoming batch cohort for student assignment"
      >
        <form onSubmit={handleCreateBatch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Batch Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. 2026 Spring Full Stack Alpha"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cohort Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
              placeholder="e.g. BATCH-2026-A"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono uppercase focus:border-indigo-500 focus:outline-none placeholder:text-slate-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalType(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Create Batch
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
