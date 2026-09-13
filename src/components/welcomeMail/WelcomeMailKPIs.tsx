import React from 'react';
import { Mail, CheckCircle2, Clock, AlertTriangle, UserX } from 'lucide-react';
import { WelcomeMailKPIs as KPIsType } from '../../types';

interface WelcomeMailKPIsProps {
  kpis: KPIsType;
  loading?: boolean;
}

export const WelcomeMailKPIs: React.FC<WelcomeMailKPIsProps> = ({ kpis, loading = false }) => {
  const cards = [
    {
      id: 'kpi-total-students',
      label: 'Total Students',
      value: kpis.totalStudents,
      description: 'Master directory count',
      icon: Mail,
      iconColor: 'text-indigo-400',
      bgGlow: 'bg-indigo-500/10',
      borderColor: 'border-slate-800',
    },
    {
      id: 'kpi-emails-sent',
      label: 'Emails Sent',
      value: kpis.sentCount,
      description: `${kpis.totalStudents > 0 ? Math.round((kpis.sentCount / kpis.totalStudents) * 100) : 0}% delivery rate`,
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      bgGlow: 'bg-emerald-500/10',
      borderColor: 'border-emerald-950/60',
    },
    {
      id: 'kpi-emails-pending',
      label: 'Queued / In Transit',
      value: kpis.pendingCount,
      description: 'Awaiting dispatch',
      icon: Clock,
      iconColor: 'text-amber-400',
      bgGlow: 'bg-amber-500/10',
      borderColor: 'border-amber-950/60',
    },
    {
      id: 'kpi-emails-failed',
      label: 'Failed Delivery',
      value: kpis.failedCount,
      description: 'Requires retry/check',
      icon: AlertTriangle,
      iconColor: 'text-rose-400',
      bgGlow: 'bg-rose-500/10',
      borderColor: 'border-rose-950/60',
    },
    {
      id: 'kpi-not-sent',
      label: 'Not Dispatched',
      value: kpis.notSentCount,
      description: 'Ready for batch send',
      icon: UserX,
      iconColor: 'text-slate-400',
      bgGlow: 'bg-slate-800/40',
      borderColor: 'border-slate-800',
    },
  ];

  return (
    <div id="welcome-mail-kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className={`p-4 rounded-2xl bg-slate-900/70 border ${card.borderColor} backdrop-blur-sm transition-all relative overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">{card.label}</span>
              <div className={`p-2 rounded-xl ${card.bgGlow}`}>
                <IconComponent className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-100 tracking-tight font-mono">
                {loading ? '—' : card.value.toLocaleString()}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 mt-1.5 truncate">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
};
