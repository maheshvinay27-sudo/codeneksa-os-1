import React from 'react';
import { Award, Clock, CheckCircle2, AlertTriangle, Hash, FileCheck2 } from 'lucide-react';
import { CertificateMetrics, CertificateTemplate } from '../../types';
import { formatCertificateNumber } from '../../services/certificateFoundationService';

interface CertificateSummarySectionProps {
  metrics: CertificateMetrics;
  activeTemplate: CertificateTemplate | null;
  currentCounterNumber: number;
}

export const CertificateSummarySection: React.FC<CertificateSummarySectionProps> = ({
  metrics,
  activeTemplate,
  currentCounterNumber,
}) => {
  const nextAllocatedId = formatCertificateNumber(currentCounterNumber + 1);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Section 2
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/80">
            System Pulse
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-100 mt-1">Certificate Summary</h3>
        <p className="text-xs text-slate-400">
          Live overview of certificate status counters, system sequence numbers, and active generation pipeline.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Records */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Records
            </span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-white font-mono">
              {metrics.totalCertificates}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Certificates in database
            </span>
          </div>
        </div>

        {/* Pending Records */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending Staged
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-amber-400 font-mono">
              {metrics.pendingCount}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Awaiting Phase 6B rendering
            </span>
          </div>
        </div>

        {/* Generated Records */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Generated
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-400 font-mono">
              {metrics.generatedCount}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Completed certificate files
            </span>
          </div>
        </div>

        {/* Failed Records */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Failed
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-rose-400 font-mono">
              {metrics.failedCount}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Attention required
            </span>
          </div>
        </div>
      </div>

      {/* Auxiliary Pipeline Status Bar */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Hash className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-slate-400 font-medium">Central Sequence Counter: </span>
            <span className="text-slate-200 font-mono font-semibold">
              Current #{currentCounterNumber}
            </span>
            <span className="text-slate-500 mx-1.5">•</span>
            <span className="text-slate-400">Next Allocated ID: </span>
            <span className="text-indigo-400 font-mono font-bold">{nextAllocatedId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Target Template: </span>
          {activeTemplate ? (
            <span className="font-semibold text-slate-200">
              {activeTemplate.name} <span className="text-indigo-400 font-mono">(v{activeTemplate.version})</span>
            </span>
          ) : (
            <span className="text-amber-400 font-semibold">No active template set</span>
          )}
        </div>
      </div>
    </div>
  );
};
