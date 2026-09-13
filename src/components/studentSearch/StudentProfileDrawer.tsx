import React, { useEffect } from 'react';
import { Student } from '../../types';
import { StudentProfileHeader } from './StudentProfileHeader';
import { StudentIdentityCard } from './StudentIdentityCard';
import { StudentContactCard } from './StudentContactCard';
import { StudentAcademicCard } from './StudentAcademicCard';
import { StudentOperationalStatus } from './StudentOperationalStatus';
import { StudentActions } from './StudentActions';

interface StudentProfileDrawerProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onViewBatch?: (batchId: string) => void;
  onViewCollege?: (collegeId: string) => void;
  onSendWelcomeEmail?: (student: Student) => void;
}

export const StudentProfileDrawer: React.FC<StudentProfileDrawerProps> = ({
  student,
  isOpen,
  onClose,
  onViewBatch,
  onViewCollege,
  onSendWelcomeEmail,
}) => {
  // Handle Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out animate-slideLeft">
          {/* Header */}
          <StudentProfileHeader student={student} onClose={onClose} />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {/* Section 1: Master Identity */}
            <StudentIdentityCard student={student} />

            {/* Section 2: Contact Details & Compliance */}
            <StudentContactCard student={student} />

            {/* Section 3: Academic Details */}
            <StudentAcademicCard
              student={student}
              onViewBatch={onViewBatch}
              onViewCollege={onViewCollege}
            />

            {/* Section 4 & 5: Operational Status & System Info */}
            <StudentOperationalStatus student={student} />

            {/* Section 6: Operations & Actions */}
            <StudentActions
              student={student}
              onViewBatch={onViewBatch}
              onViewCollege={onViewCollege}
              onSendWelcomeEmail={onSendWelcomeEmail}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
