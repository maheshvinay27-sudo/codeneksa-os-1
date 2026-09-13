import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Clock, CheckCircle } from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { Course } from '../types';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNotification } from '../context/NotificationContext';
import { recordActivity } from '../services/dashboardService';

export const CoursesPage: React.FC = () => {
  const { success, error } = useNotification();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [duration, setDuration] = useState(3);
  const [description, setDescription] = useState('');

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'courses'));
      const list: Course[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<Course, 'id'>) });
      });
      setCourses(list);
    } catch (err) {
      console.warn('Courses fetch error:', err);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) {
      error('Validation Error', 'Course title and curriculum code are required.');
      return;
    }

    setSubmitting(true);
    try {
      const nowStr = new Date().toISOString();
      await addDoc(collection(db, 'courses'), {
        title: title.trim(),
        code: code.trim().toUpperCase(),
        durationMonths: Number(duration) || 3,
        description: description.trim(),
        active: true,
        createdAt: nowStr,
        updatedAt: nowStr,
      });

      await recordActivity({
        actionType: 'COURSE_CREATED',
        description: `Course added: ${title.trim()} [${code.trim().toUpperCase()}]`,
        category: 'academic',
        metadata: { courseCode: code.trim().toUpperCase() },
      });

      success('Course Created', `${title} registered in Cloud Firestore.`);
      setTitle('');
      setCode('');
      setDuration(3);
      setDescription('');
      setModalOpen(false);
      fetchCourses();
    } catch (err: unknown) {
      error('Error', err instanceof Error ? err.message : 'Could not add course.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Courses & Curriculum</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage EdTech curriculum catalog, certifications, and course duration
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
        >
          Add Course
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Curriculum Catalog"
          subtitle="Directly linked to Cloud Firestore collection: /courses"
          action={
            <Badge variant="purple" size="md">
              Total: {courses.length}
            </Badge>
          }
        />

        {courses.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-7 h-7" />}
            title="No courses registered yet"
            description="Register your EdTech training courses (e.g., Full Stack Development, Cloud Engineering, Data Science). Each course will anchor batch schedules and certificate issuance."
            actionLabel="Create First Course"
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((crs) => (
              <div
                key={crs.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                      {crs.code}
                    </span>
                    <Badge variant={crs.active ? 'success' : 'neutral'}>
                      {crs.active ? 'Active' : 'Draft'}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2.5 leading-snug">{crs.title}</h4>
                  {crs.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {crs.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {crs.durationMonths} Months Duration
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Course Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Course Curriculum"
        description="Define a new curriculum track for student cohorts"
      >
        <form onSubmit={handleAddCourse} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Course Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advanced Cloud Architecture & DevOps"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Curriculum Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. DEVOPS-201"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono uppercase focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Duration (Months)</label>
              <input
                type="number"
                min="1"
                max="24"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description / Learning Objectives</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Comprehensive industry training program covering containerization, CI/CD pipelines, and cloud security."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-slate-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Save Course
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
