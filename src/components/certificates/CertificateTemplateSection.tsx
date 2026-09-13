import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileImage,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Calendar,
  Sparkles,
  Eye,
  X,
} from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { CertificateTemplate } from '../../types';
import {
  uploadCertificateTemplate,
  replaceCertificateTemplate,
  setActiveCertificateTemplate,
} from '../../services/certificateFoundationService';
import { useNotification } from '../../context/NotificationContext';

interface CertificateTemplateSectionProps {
  templates: CertificateTemplate[];
  activeTemplate: CertificateTemplate | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const CertificateTemplateSection: React.FC<CertificateTemplateSectionProps> = ({
  templates,
  activeTemplate,
  isLoading,
  onRefresh,
}) => {
  const { success, error } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('Codeneksa Internship Certificate');
  const [templateVersion, setTemplateVersion] = useState('1');
  const [isUploading, setIsUploading] = useState(false);

  // Replace modal state
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacePreviewUrl, setReplacePreviewUrl] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  // Fullscreen preview modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Handle file select for new upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.type.includes('image')) {
      error('Invalid File', 'Please upload a PNG image file.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Handle file select for replace
  const handleReplaceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.type.includes('image')) {
      error('Invalid File', 'Please upload a PNG image file.');
      return;
    }

    setReplaceFile(file);
    const objectUrl = URL.createObjectURL(file);
    setReplacePreviewUrl(objectUrl);
  };

  // Submit new template upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      error('No File Selected', 'Please select a PNG master certificate file.');
      return;
    }

    if (!templateName.trim()) {
      error('Missing Name', 'Please enter a template name.');
      return;
    }

    setIsUploading(true);
    try {
      await uploadCertificateTemplate(
        selectedFile,
        templateName.trim(),
        templateVersion.trim() || '1'
      );
      success('Template Uploaded', `Master template "${templateName}" saved to Firebase Storage.`);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      onRefresh();
    } catch (err: unknown) {
      error('Upload Failed', err instanceof Error ? err.message : 'Could not upload template.');
    } finally {
      setIsUploading(false);
    }
  };

  // Submit template replacement (Version bump)
  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate) return;
    if (!replaceFile) {
      error('No File Selected', 'Please select the new PNG artwork.');
      return;
    }

    setIsReplacing(true);
    try {
      const updated = await replaceCertificateTemplate(activeTemplate.id, replaceFile);
      success(
        'Template Replaced',
        `Master artwork updated to Version ${updated.version} in Firebase Storage.`
      );
      setIsReplaceModalOpen(false);
      setReplaceFile(null);
      setReplacePreviewUrl(null);
      onRefresh();
    } catch (err: unknown) {
      error('Replace Failed', err instanceof Error ? err.message : 'Could not replace template.');
    } finally {
      setIsReplacing(false);
    }
  };

  // Set active template
  const handleSetActive = async (templateId: string) => {
    try {
      await setActiveCertificateTemplate(templateId);
      success('Active Template Updated', 'The selected template is now active for certificate operations.');
      onRefresh();
    } catch (err: unknown) {
      error('Activation Failed', err instanceof Error ? err.message : 'Could not update active template.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Section 1
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Master Artwork
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-100 mt-1">
            Certificate Template Management
          </h3>
          <p className="text-xs text-slate-400">
            Upload and manage the master certificate PNG artwork. Stored securely in Firebase Storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Sync</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Master PNG</span>
          </Button>
        </div>
      </div>

      {/* Active Template Spotlight Card */}
      {activeTemplate ? (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Artwork Preview Thumbnail */}
            <div className="lg:col-span-5 relative group rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 flex items-center justify-center p-2">
              {activeTemplate.fileUrl ? (
                <div className="relative w-full aspect-[1.414/1] rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center">
                  <img
                    src={activeTemplate.fileUrl}
                    alt={activeTemplate.name}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                    <button
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Full Artwork View</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-[1.414/1] flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <FileImage className="w-8 h-8 text-slate-600" />
                  <span>Image preview pending</span>
                </div>
              )}
            </div>

            {/* Template Metadata & Action Controls */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  ACTIVE MASTER TEMPLATE
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                  Version {activeTemplate.version}
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-white tracking-tight">
                  {activeTemplate.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-mono break-all">
                  {activeTemplate.storagePath}
                </p>
              </div>

              {/* Grid of Spec Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    File Name
                  </span>
                  <span className="text-xs font-semibold text-slate-200 truncate block mt-0.5" title={activeTemplate.fileName}>
                    {activeTemplate.fileName}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Upload Date
                  </span>
                  <span className="text-xs font-semibold text-slate-200 block mt-0.5">
                    {new Date(activeTemplate.createdAt).toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Managed By
                  </span>
                  <span className="text-xs font-semibold text-slate-200 truncate block mt-0.5" title={activeTemplate.createdBy}>
                    {activeTemplate.createdBy.split('@')[0]}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Master PNG</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsReplaceModalOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace Artwork (New Version)</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: No Template Uploaded */
        <div className="rounded-2xl bg-slate-900/50 border border-dashed border-slate-700/80 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <FileImage className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-200">No Master Template Uploaded</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Upload the official Codeneksa certificate PNG artwork to initialize Phase 6A template management in Firebase Storage.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Certificate PNG</span>
          </Button>
        </div>
      )}

      {/* Template History / Alternate Versions Drawer or Table */}
      {templates.length > 1 && (
        <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Template Version Registry ({templates.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className={`p-3 rounded-xl border transition-all ${
                  tpl.isActive
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200 truncate">{tpl.name}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        v{tpl.version}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate">{tpl.fileName}</span>
                    </div>
                  </div>

                  {tpl.isActive ? (
                    <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetActive(tpl.id)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      Set Active
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Master Template Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setSelectedFile(null);
          setPreviewUrl(null);
        }}
        title="Upload Master Certificate Artwork (PNG)"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
            <strong>Source of Truth:</strong> The uploaded PNG is the master design. It will be stored in Firebase Storage at <code className="font-mono text-white">certificate-templates/{'{templateId}'}/{'{version}'}/master.png</code>.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Template Display Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Codeneksa Internship Certificate"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Initial Version
            </label>
            <input
              type="text"
              value={templateVersion}
              onChange={(e) => setTemplateVersion(e.target.value)}
              placeholder="1"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* File Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Master PNG File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!selectedFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-6 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-900/50 hover:bg-slate-900 transition-colors flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  Click to select PNG certificate artwork
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  High-resolution PNG master artwork recommended
                </span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2.5 truncate">
                    <FileImage className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-semibold text-slate-200 block truncate">
                        {selectedFile.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {previewUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 max-h-56 flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-48 object-contain rounded"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsUploadModalOpen(false);
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!selectedFile || isUploading}
              className="flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Storage...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload & Save Template</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Replace Template (New Version) Modal */}
      <Modal
        isOpen={isReplaceModalOpen}
        onClose={() => {
          setIsReplaceModalOpen(false);
          setReplaceFile(null);
          setReplacePreviewUrl(null);
        }}
        title={`Replace Master Artwork (Version Bump)`}
      >
        <form onSubmit={handleReplaceSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <strong>Version Progression:</strong> Uploading new artwork will increment the version from{' '}
            <span className="font-mono font-bold text-white">v{activeTemplate?.version || 1}</span> to{' '}
            <span className="font-mono font-bold text-white">
              v{(parseInt(String(activeTemplate?.version || 1).replace(/\D/g, ''), 10) || 1) + 1}
            </span>
            . All future certificates will automatically use the updated version.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Replacement PNG Artwork
            </label>
            <input
              ref={replaceFileInputRef}
              type="file"
              accept="image/png,image/*"
              onChange={handleReplaceFileSelect}
              className="hidden"
            />

            {!replaceFile ? (
              <button
                type="button"
                onClick={() => replaceFileInputRef.current?.click()}
                className="w-full p-6 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-900/50 hover:bg-slate-900 transition-colors flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  Choose new PNG certificate artwork
                </span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2.5 truncate">
                    <FileImage className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-semibold text-slate-200 block truncate">
                        {replaceFile.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {(replaceFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceFile(null);
                      setReplacePreviewUrl(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {replacePreviewUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 max-h-56 flex items-center justify-center">
                    <img
                      src={replacePreviewUrl}
                      alt="New Version Preview"
                      className="max-h-48 object-contain rounded"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsReplaceModalOpen(false);
                setReplaceFile(null);
                setReplacePreviewUrl(null);
              }}
              disabled={isReplacing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!replaceFile || isReplacing}
              className="flex items-center gap-1.5"
            >
              {isReplacing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Replacing Template...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Confirm New Version</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Full Artwork Preview Modal */}
      {activeTemplate && isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{activeTemplate.name}</h3>
                <p className="text-xs text-slate-400 font-mono">Version {activeTemplate.version} • {activeTemplate.fileName}</p>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-2 flex items-center justify-center">
              <img
                src={activeTemplate.fileUrl}
                alt={activeTemplate.name}
                className="max-h-[70vh] w-auto object-contain rounded shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
              <span>Source of Truth: Visual layout rendered from original master PNG</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewModalOpen(false)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
