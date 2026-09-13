import React from 'react';
import { Card } from '../common/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  isLoading?: boolean;
  emptyNotice?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  isLoading = false,
  emptyNotice,
  onClick,
}) => {
  const isZero = typeof value === 'number' && value === 0;

  return (
    <Card
      hoverEffect={!!onClick}
      onClick={onClick}
      className={`relative overflow-hidden transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-8 flex items-center">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight font-mono">
                {value}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {isZero && emptyNotice && (
            <p className="text-[11px] text-indigo-400/80 font-medium mt-1.5 flex items-center gap-1">
              <span>•</span> {emptyNotice}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-indigo-400 shrink-0">
          {icon}
        </div>
      </div>
      {/* Subtle bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
    </Card>
  );
};
