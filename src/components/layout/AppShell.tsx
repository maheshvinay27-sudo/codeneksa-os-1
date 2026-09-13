import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DataEmployeeModal } from '../dataEmployee/DataEmployeeModal';
import { NavSection } from '../../types';

interface AppShellProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentSection,
  onNavigate,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex text-slate-900 dark:text-slate-100 selection:bg-indigo-500/20 transition-colors duration-150">
      {/* Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onNavigate={onNavigate}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onRunDataEmployee={() => setIsDataModalOpen(true)}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          currentSection={currentSection}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onNavigate={onNavigate}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Data Employee Trigger */}
      <DataEmployeeModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onImportSuccess={() => {
          onNavigate('students-all');
        }}
        onViewBatch={() => {
          onNavigate('students-batches');
        }}
        onViewStudents={() => {
          onNavigate('students-all');
        }}
      />
    </div>
  );
};
