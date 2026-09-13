import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface EmployeeCardProps {
  number: string;
  icon: LucideIcon;
  name: string;
  purpose: string;
  status?: string;
  metric?: string;
  onRun: () => void;
  actionText?: string;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  number,
  icon: Icon,
  name,
  purpose,
  status = 'READY',
  metric,
  onRun,
  actionText = 'RUN',
}) => {
  return (
    <div
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
    >
      {/* Top Header: Number and Icon */}
      <div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">
            {number}
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        </div>

        {/* Employee Name & Purpose */}
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {purpose}
          </p>
        </div>
      </div>

      {/* Bottom Area: Status & RUN Button */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
              {status}
            </span>
          </div>
          {metric && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
              {metric}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onRun}
          className="group/btn relative inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold tracking-tight shadow-xs transition-all duration-150 active:scale-95 shrink-0"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover/btn:translate-x-1" />
        </button>
      </div>
    </div>
  );
};
