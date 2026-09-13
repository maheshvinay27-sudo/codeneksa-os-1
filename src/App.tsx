import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { CollegesPage } from './pages/CollegesPage';
import { CoursesPage } from './pages/CoursesPage';
import { CommunicationPage } from './pages/CommunicationPage';
import { WelcomeMailPage } from './pages/WelcomeMailPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { NavSection } from './types';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex flex-col items-center justify-center p-4 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-black text-xl shadow-lg">
            C
          </div>
          <div className="text-center">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wider font-mono">
              CODENEKSA OS
            </h2>
            <p className="text-xs text-slate-500 mt-1">Initializing operational environment...</p>
          </div>
          <LoadingSpinner size="md" className="mt-2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderCurrentView = () => {
    switch (currentSection) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentSection} />;
      case 'students':
      case 'students-all':
        return <StudentsPage initialSubTab="all" onNavigate={setCurrentSection} />;
      case 'students-batches':
        return <StudentsPage initialSubTab="batches" onNavigate={setCurrentSection} />;
      case 'students-search':
        return <StudentsPage initialSubTab="search" onNavigate={setCurrentSection} />;
      case 'students-id-employee':
        return <StudentsPage initialSubTab="id-employee" onNavigate={setCurrentSection} />;
      case 'colleges':
        return <CollegesPage />;
      case 'courses':
        return <CoursesPage />;
      case 'certificates':
        return <CertificatesPage />;
      case 'communication':
      case 'communication-welcome-mail':
      case 'welcome-mail' as any:
        return <WelcomeMailPage onNavigateToStudent={() => setCurrentSection('students-search')} />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentSection} />;
    }
  };

  return (
    <AppShell currentSection={currentSection} onNavigate={setCurrentSection}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSection}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {renderCurrentView()}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
