import React, { useState, useRef, useEffect } from 'react';
import {
  Sliders,
  X,
  Check,
  Eye,
  FileDown,
  Sparkles,
  Move,
  Type,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { CertificateTemplate, CertificateCalibrationConfig } from '../../types';
import { Button } from '../common/Button';
import {
  DEFAULT_CALIBRATION,
  generateSingleCertificatePdf,
  saveTemplateCalibration,
  fetchImageBytes,
} from '../../services/certificateGeneratorService';
import { useNotification } from '../../context/NotificationContext';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: CertificateTemplate | null;
  onSaved: (updatedCalibration: CertificateCalibrationConfig) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  template,
  onSaved,
}) => {
  const { success, error } = useNotification();
  const [config, setConfig] = useState<CertificateCalibrationConfig>(
    template?.calibration || DEFAULT_CALIBRATION
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [sampleStudentName, setSampleStudentName] = useState('Priya Sharma');

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (template?.calibration) {
      setConfig(template.calibration);
    } else {
      setConfig(DEFAULT_CALIBRATION);
    }
  }, [template]);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const xPct = Math.round((x / rect.width) * 100);
    const yPct = Math.round((y / rect.height) * 100);

    setConfig((prev) => ({
      ...prev,
      xPercent: xPct,
      yPercent: yPct,
    }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleSave = async () => {
    if (!template?.id) {
      error('No Template', 'Please upload a master PNG template first.');
      return;
    }
    setIsSaving(true);
    try {
      await saveTemplateCalibration(template.id, config);
      success('Calibration Saved', 'Name position and typography preferences saved.');
      onSaved(config);
      onClose();
    } catch (err) {
      error('Save Failed', err instanceof Error ? err.message : 'Could not save calibration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestCertificate = async () => {
    if (!template?.fileUrl) {
      error('No Template Image', 'Please upload a master template PNG first.');
      return;
    }
    setIsGeneratingTest(true);
    try {
      const pngBytes = await fetchImageBytes(template.fileUrl);
      const { pdfBlob } = await generateSingleCertificatePdf({
        masterPngBytes: pngBytes,
        studentName: sampleStudentName.trim() || 'Sample Student',
        certificateNumber: 'CKS-CERT-SAMPLE',
        calibration: config,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test_certificate_${(sampleStudentName || 'Rahul_Sharma').replace(/\s+/g, '_')}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 100);
      success('Test Certificate Generated', 'Generated test certificate PDF.');
    } catch (err) {
      error('Test Failed', err instanceof Error ? err.message : 'Could not generate test PDF');
    } finally {
      setIsGeneratingTest(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onPointerUp={handlePointerUp}
    >
      <div className="bg-white text-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Calibrate Student Name Position
              </h2>
              <p className="text-xs text-slate-500">
                Drag the name directly onto the master artwork or adjust coordinates and font styling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestCertificate}
              disabled={isGeneratingTest}
              className="flex items-center gap-1.5 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-300"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${isGeneratingTest ? 'animate-spin' : ''}`} />
              <span>{isGeneratingTest ? 'Rendering...' : 'Test PDF'}</span>
            </Button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden">
          {/* Left / Center: Interactive Canvas Visual Area */}
          <div className="lg:col-span-2 p-6 bg-slate-100/60 overflow-y-auto flex flex-col items-center justify-center">
            <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
              <Move className="w-3.5 h-3.5 text-indigo-500" />
              <span>Click and drag the student name badge to position it on the artwork</span>
            </div>

            {template?.fileUrl ? (
              <div
                ref={containerRef}
                onPointerMove={handlePointerMove}
                className="relative w-full max-w-2xl aspect-[1.414/1] rounded-2xl overflow-hidden shadow-lg border border-slate-300 bg-white select-none cursor-crosshair"
              >
                {/* Master PNG Background */}
                <img
                  src={template.fileUrl}
                  alt="Certificate Template"
                  className="w-full h-full object-contain pointer-events-none"
                  referrerPolicy="no-referrer"
                />

                {/* Overlaid Draggable Student Name */}
                <div
                  onPointerDown={handlePointerDown}
                  style={{
                    position: 'absolute',
                    left: `${config.xPercent}%`,
                    top: `${config.yPercent}%`,
                    transform:
                      config.alignment === 'center'
                        ? 'translate(-50%, -50%)'
                        : config.alignment === 'right'
                        ? 'translate(-100%, -50%)'
                        : 'translate(0, -50%)',
                    fontFamily:
                      config.fontFamily === 'Times-Roman'
                        ? 'serif'
                        : config.fontFamily === 'Courier'
                        ? 'monospace'
                        : 'sans-serif',
                    fontWeight: config.fontWeight === 'bold' ? 700 : 400,
                    color: config.color || '#111827',
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm md:text-base border-2 border-dashed border-indigo-500 bg-indigo-50/90 shadow-lg cursor-grab active:cursor-grabbing transition-shadow ${
                    isDragging ? 'ring-4 ring-indigo-500/20 shadow-2xl' : ''
                  }`}
                >
                  <span className="font-bold tracking-tight">
                    {sampleStudentName || 'STUDENT NAME'}
                  </span>
                </div>

                {/* Optional Certificate Number Overlay indicator */}
                {config.includeCertNumber && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${config.certNumberXPercent ?? 20}%`,
                      top: `${config.certNumberYPercent ?? 86}%`,
                    }}
                    className="text-[10px] font-mono text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded border border-slate-300 select-none pointer-events-none"
                  >
                    CKS-CERT-000001
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full max-w-xl aspect-[1.414/1] rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-8 text-center bg-white">
                <Type className="w-12 h-12 text-slate-400 mb-3" />
                <h4 className="font-bold text-slate-700">No Master PNG Template Loaded</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Please upload your official certificate PNG template on the main page to preview name calibration.
                </p>
              </div>
            )}

            <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
              <span>X: <strong>{config.xPercent}%</strong></span>
              <span>Y: <strong>{config.yPercent}%</strong></span>
              <span>Font: <strong>{config.fontSize}pt</strong></span>
              <span>Alignment: <strong className="capitalize">{config.alignment}</strong></span>
            </div>
          </div>

          {/* Right: Fine-Tuning Controls */}
          <div className="p-6 border-l border-slate-100 bg-white overflow-y-auto space-y-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Position & Typography</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Precision adjustments for the dynamic student name.
              </p>
            </div>

            {/* Sample Student Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sample Preview Name
              </label>
              <input
                type="text"
                value={sampleStudentName}
                onChange={(e) => setSampleStudentName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                placeholder="Student Name..."
              />
            </div>

            {/* Coordinates X & Y */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Horizontal X ({config.xPercent}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.xPercent}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, xPercent: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vertical Y ({config.yPercent}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.yPercent}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, yPercent: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Font Size ({config.fontSize} pt)
                </label>
                <input
                  type="range"
                  min="18"
                  max="72"
                  value={config.fontSize}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, fontSize: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Weight
                </label>
                <select
                  value={config.fontWeight}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      fontWeight: e.target.value as 'normal' | 'bold',
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="bold">Bold (Recommended)</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
            </div>

            {/* Font Family & Alignment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Font Family
                </label>
                <select
                  value={config.fontFamily}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      fontFamily: e.target.value as 'Helvetica' | 'Times-Roman' | 'Courier',
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="Helvetica">Helvetica (Sans-Serif)</option>
                  <option value="Times-Roman">Times-Roman (Formal Serif)</option>
                  <option value="Courier">Courier (Monospace)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alignment
                </label>
                <select
                  value={config.alignment}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      alignment: e.target.value as 'center' | 'left' | 'right',
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="center">Center</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Name Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.color || '#111827'}
                  onChange={(e) => setConfig((p) => ({ ...p, color: e.target.value }))}
                  className="w-9 h-9 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={config.color || '#111827'}
                  onChange={(e) => setConfig((p) => ({ ...p, color: e.target.value }))}
                  className="w-28 px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 font-mono"
                />
              </div>
            </div>

            {/* Certificate Number Options */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeCertNumber}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, includeCertNumber: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Include Certificate Number (CKS-CERT-XXXXXX)
                </span>
              </label>

              {config.includeCertNumber && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <div>
                    <span className="text-[10px] text-slate-500">Number X: {config.certNumberXPercent ?? 20}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.certNumberXPercent ?? 20}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, certNumberXPercent: Number(e.target.value) }))
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Number Y: {config.certNumberYPercent ?? 86}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.certNumberYPercent ?? 86}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, certNumberYPercent: Number(e.target.value) }))
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfig(DEFAULT_CALIBRATION)}
                className="text-xs border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                Reset Default
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Calibration'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
