import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Database,
  IdCard,
  Search,
  Mail,
  Award,
  BookOpen,
  Users,
  FolderKanban,
  Building2,
  TrendingUp,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import { NavSection } from '../../types';
import { Logo } from '../common/Logo';

interface SidebarProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onRunDataEmployee?: () => void;
}

const SIDEBAR_COLLAPSED_KEY = 'codeneksa_sidebar_collapsed';

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  onRunDataEmployee,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
    } catch {}
  }, [isCollapsed]);

  const handleNavClick = (section: NavSection, customAction?: () => void) => {
    if (customAction) {
      customAction();
    } else {
      onNavigate(section);
    }
    onCloseMobile();
  };

  const employeeItems = [
    {
      id: 'emp-data',
      number: '01',
      label: 'Data Employee',
      shortLabel: 'Data',
      icon: <Database className="w-4 h-4" />,
      action: () => {
        if (onRunDataEmployee) {
          onRunDataEmployee();
        } else {
          onNavigate('dashboard');
        }
      },
      isActive: false,
    },
    {
      id: 'students-id-employee' as NavSection,
      number: '02',
      label: 'Student ID Employee',
      shortLabel: 'Student ID',
      icon: <IdCard className="w-4 h-4" />,
      action: () => onNavigate('students-id-employee'),
      isActive: currentSection === 'students-id-employee',
    },
    {
      id: 'students-search' as NavSection,
      number: '03',
      label: 'Search Employee',
      shortLabel: 'Search',
      icon: <Search className="w-4 h-4" />,
      action: () => onNavigate('students-search'),
      isActive: currentSection === 'students-search',
    },
    {
      id: 'communication' as NavSection,
      number: '04',
      label: 'Welcome Mail Employee',
      shortLabel: 'Welcome Mail',
      icon: <Mail className="w-4 h-4" />,
      action: () => onNavigate('communication'),
      isActive: currentSection === 'communication' || currentSection === 'welcome-mail' as any,
    },
    {
      id: 'certificates' as NavSection,
      number: '05',
      label: 'Certificate Employee',
      shortLabel: 'Certificates',
      icon: <Award className="w-4 h-4" />,
      action: () => onNavigate('certificates'),
      isActive: currentSection === 'certificates',
    },
    {
      id: 'courses' as NavSection,
      number: '06',
      label: 'Course Employee',
      shortLabel: 'Courses',
      icon: <BookOpen className="w-4 h-4" />,
      action: () => onNavigate('courses'),
      isActive: currentSection === 'courses',
    },
  ];

  const workspaceItems = [
    {
      id: 'students-all' as NavSection,
      label: 'Students',
      icon: <Users className="w-4 h-4" />,
      isActive: currentSection === 'students' || currentSection === 'students-all',
    },
    {
      id: 'students-batches' as NavSection,
      label: 'Batches',
      icon: <FolderKanban className="w-4 h-4" />,
      isActive: currentSection === 'students-batches',
    },
    {
      id: 'colleges' as NavSection,
      label: 'Colleges',
      icon: <Building2 className="w-4 h-4" />,
      isActive: currentSection === 'colleges',
    },
    {
      id: 'courses' as NavSection,
      label: 'Courses',
      icon: <BookOpen className="w-4 h-4" />,
      isActive: currentSection === 'courses',
    },
  ];

  const sidebarContent = (
    <div
      className={`flex flex-col h-full bg-white dark:bg-[#0b0f19] border-r border-slate-200 dark:border-slate-800/80 select-none transition-all duration-200 ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between ${isCollapsed ? 'px-3' : 'px-4'}`}>
        <div
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2 cursor-pointer min-w-0"
        >
          {isCollapsed ? (
            <Logo variant="mark" size="sm" />
          ) : (
            <Logo variant="header" showTagline={true} />
          )}
        </div>

        {/* Toggle Collapse (Desktop only) */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin">
        {/* COMMAND CENTER GROUP */}
        <div>
          {!isCollapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              Command Center
            </div>
          )}
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            title="Command Center"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
            } py-2 rounded-xl text-xs font-semibold transition-all ${
              currentSection === 'dashboard'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Command Center</span>}
          </button>
        </div>

        {/* EMPLOYEES GROUP */}
        <div>
          {!isCollapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              Employees
            </div>
          )}
          <div className="space-y-0.5">
            {employeeItems.map((emp) => {
              const isActive = emp.isActive;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleNavClick(emp.id as NavSection, emp.action)}
                  title={`${emp.number} ${emp.label}`}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-0' : 'justify-between px-2.5'
                  } py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 font-semibold border border-indigo-200/80 dark:border-indigo-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-slate-400 dark:text-slate-500">{emp.icon}</span>
                    {!isCollapsed && (
                      <span className="truncate">{emp.label}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                      {emp.number}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* WORKSPACE GROUP */}
        <div>
          {!isCollapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              Workspace
            </div>
          )}
          <div className="space-y-0.5">
            {workspaceItems.map((item) => {
              const isActive = item.isActive;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={item.label}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                  } py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="shrink-0 text-slate-400 dark:text-slate-500">{item.icon}</span>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* INSIGHTS GROUP */}
        <div>
          {!isCollapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              Insights
            </div>
          )}
          <button
            type="button"
            onClick={() => handleNavClick('analytics')}
            title="Analytics"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
            } py-1.5 rounded-xl text-xs font-medium transition-all ${
              currentSection === 'analytics'
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
            {!isCollapsed && <span>Analytics</span>}
          </button>
        </div>

        {/* SYSTEM GROUP */}
        <div>
          {!isCollapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              System
            </div>
          )}
          <button
            type="button"
            onClick={() => handleNavClick('settings')}
            title="Settings"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
            } py-1.5 rounded-xl text-xs font-medium transition-all ${
              currentSection === 'settings'
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <SettingsIcon className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
            {!isCollapsed && <span>Settings</span>}
          </button>
        </div>
      </div>

      {/* Footer Operator Indicator */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium truncate">Operations Workforce Ready</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity"
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
