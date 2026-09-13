import React from 'react';
import { X, Image as ImageIcon, Download, CheckCircle2 } from 'lucide-react';
import { CertificateTemplate } from '../../types';
import { Button } from '../common/Button';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: CertificateTemplate | null;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  isOpen,
  onClose,
  template,
}) => {
  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Master Artwork Preview
              </h2>
              <p className="text-xs text-slate-500">
                {template.fileName} • {template.imageWidth || 2000} × {template.imageHeight || 1414} px
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {template.fileUrl && (
              <a
                href={template.fileUrl}
                download={template.fileName}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Original
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-100/50 flex items-center justify-center">
          {template.fileUrl ? (
            <img
              src={template.fileUrl}
              alt="Master Certificate Artwork"
              className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
              referrerPolicy="no-referrer"
            />
          ) : (
            <p className="text-sm text-slate-500">No preview URL available.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Official Codeneksa Master Artwork Source of Truth
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="border-slate-300">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
