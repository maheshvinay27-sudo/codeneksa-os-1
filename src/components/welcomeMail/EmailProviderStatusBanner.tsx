import React from 'react';
import { CheckCircle, AlertTriangle, ShieldCheck, Server, Mail, Send } from 'lucide-react';
import { EmailProviderConfig } from '../../types';

interface EmailProviderStatusBannerProps {
  config: EmailProviderConfig;
  onOpenTestModal?: () => void;
}

export const EmailProviderStatusBanner: React.FC<EmailProviderStatusBannerProps> = ({
  config,
  onOpenTestModal,
}) => {
  if (config.configured) {
    return (
      <div
        id="email-provider-banner-active"
        className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 mt-0.5">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-emerald-100">
                Email Provider Connected
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {config.provider}
              </span>
            </div>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              Live dispatch enabled • Sender: <strong className="text-emerald-100">{config.fromName}</strong> &lt;{config.fromAddress}&gt;
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onOpenTestModal && (
            <button
              id="btn-send-test-email-banner"
              type="button"
              onClick={onOpenTestModal}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-950"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Email</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      id="email-provider-banner-unconfigured"
      className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/60 text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-amber-100 uppercase tracking-wide">
              Email Provider Not Configured (Development Mode)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              Provider Inactive
            </span>
          </div>
          <p className="text-xs text-amber-300/80 mt-1 max-w-3xl leading-relaxed">
            Template editing, dynamic preview, recipient validation, and batch queue preparation are <strong>fully operational</strong>. Actual student email delivery requires <code className="px-1.5 py-0.5 rounded bg-slate-900 font-mono text-[11px] text-amber-200">EMAIL_API_KEY</code> and <code className="px-1.5 py-0.5 rounded bg-slate-900 font-mono text-[11px] text-amber-200">EMAIL_PROVIDER</code> in server settings. No fake sent records will ever be created.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onOpenTestModal && (
          <button
            id="btn-test-unconfigured-provider"
            type="button"
            onClick={onOpenTestModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 font-semibold text-xs flex items-center gap-1.5 transition-all border border-amber-700/50"
          >
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Mode Simulator</span>
          </button>
        )}
      </div>
    </div>
  );
};
