import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  Award,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { Button } from '../common/Button';

interface CertificateViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: {
    studentName: string;
    certificateNumber: string;
    pdfBytes?: Uint8Array;
    previewUrl?: string;
    fileUrl?: string;
    generatedDate: string;
  } | null;
  onPrint?: (cert: {
    studentName: string;
    certificateNumber: string;
    pdfBytes?: Uint8Array;
    previewUrl?: string;
  }) => void;
  onDownload?: (cert: {
    studentName: string;
    certificateNumber: string;
    pdfBytes?: Uint8Array;
  }) => void;
}

export const CertificateViewerModal: React.FC<CertificateViewerModalProps> = ({
  isOpen,
  onClose,
  certificate,
  onPrint,
  onDownload,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = fit, 1.5 = zoom

  if (!isOpen || !certificate) return null;

  const imageSrc = certificate.previewUrl || certificate.fileUrl || '';

  const handlePrint = () => {
    if (onPrint) {
      onPrint(certificate);
      return;
    }

    if (!imageSrc) return;

    // Direct printable landscape window (immune to Chrome iframe blocking)
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Print Certificate - ${certificate.certificateNumber} - ${certificate.studentName}</title>
          <style>
            @page {
              size: landscape;
              margin: 0;
            }
            *, *::before, *::after {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100vw;
              height: 100vh;
              background-color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            img {
              max-width: 100vw;
              max-height: 100vh;
              width: auto;
              height: auto;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${imageSrc}" alt="Certificate" onload="window.focus(); setTimeout(function() { window.print(); }, 250);" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPdf = () => {
    if (onDownload) {
      onDownload(certificate);
      return;
    }

    if (certificate.pdfBytes) {
      const blob = new Blob([certificate.pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${certificate.certificateNumber}_${certificate.studentName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 150);
    } else if (certificate.fileUrl) {
      window.open(certificate.fileUrl, '_blank');
    }
  };

  const handleDownloadImage = () => {
    if (!imageSrc) return;
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = `${certificate.certificateNumber}_${certificate.studentName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col w-full max-w-5xl h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {certificate.studentName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {certificate.certificateNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                Generated on {certificate.generatedDate} • Official Certificate Preview
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2">
            {/* Zoom Toggle */}
            <div className="hidden sm:flex items-center bg-slate-200/70 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  zoomLevel === 1 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Fit to Screen"
              >
                <Maximize2 className="w-3.5 h-3.5 inline mr-1" />
                Fit
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1.5)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  zoomLevel === 1.5 ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Zoom 150%"
              >
                <ZoomIn className="w-3.5 h-3.5 inline mr-1" />
                Zoom
              </button>
            </div>

            {/* Print Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs"
              title="Print High-Resolution Landscape Certificate"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-purple-600" />
              Print
            </Button>

            {/* Download PDF Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              title="Download Vector PDF"
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Download PDF
            </Button>

            {/* Download PNG Button */}
            {imageSrc && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadImage}
                className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
                title="Download PNG Certificate Image"
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1" />
                PNG
              </Button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors ml-1"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Display Area - Immune to Chrome iframe blocks */}
        <div className="flex-1 w-full bg-slate-950/5 p-3 sm:p-6 overflow-auto flex items-center justify-center">
          {imageSrc ? (
            <div
              className="transition-all duration-200 flex items-center justify-center"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={imageSrc}
                alt={`Certificate for ${certificate.studentName}`}
                className="max-h-[72vh] max-w-[90vw] object-contain rounded-2xl shadow-xl border border-slate-200 bg-white"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <Award className="w-12 h-12 text-slate-300 mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-slate-700">Generating certificate preview...</p>
              <p className="text-xs text-slate-400 mt-1">Please wait while the certificate rendering completes.</p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-2.5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Codeneksa Official Certificate Format • High-DPI Landscape Print Ready
          </span>
          <span className="font-mono text-slate-400">
            ID: {certificate.certificateNumber}
          </span>
        </div>
      </div>
    </div>
  );
};
