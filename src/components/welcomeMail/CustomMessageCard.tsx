import React, { useState, useRef, useEffect } from 'react';
import {
  Mail,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
  FileEdit,
  Send,
  Info,
} from 'lucide-react';
import { EmailTemplate, Student } from '../../types';
import { TEMPLATE_VARIABLES, DEFAULT_WELCOME_TEMPLATE } from '../../services/emailTemplateService';

interface CustomMessageCardProps {
  template: EmailTemplate;
  onSaveTemplate: (template: EmailTemplate) => Promise<void>;
  onOpenPreview: () => void;
  sampleStudent?: Student | null;
  activeBatchId?: string;
}

export const CustomMessageCard: React.FC<CustomMessageCardProps> = ({
  template,
  onSaveTemplate,
  onOpenPreview,
  activeBatchId,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [formData, setFormData] = useState<EmailTemplate>(template);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setFormData(template);
  }, [template]);

  const handleInsertVariable = (varKey: string) => {
    if (!textareaRef.current) {
      setFormData((prev) => ({ ...prev, body: prev.body + ' ' + varKey }));
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentBody = formData.body;

    const newBody =
      currentBody.substring(0, start) + varKey + currentBody.substring(end);
    setFormData((prev) => ({ ...prev, body: newBody }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 50);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset message content to official standard default?')) {
      setFormData({
        ...DEFAULT_WELCOME_TEMPLATE,
        id: template.id || DEFAULT_WELCOME_TEMPLATE.id,
      });
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveTemplate(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save custom message:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="custom-message-card"
      className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-lg transition-all"
    >
      {/* Header bar */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                Custom Mail Message & Template
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                Active for Batch Sends
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize the message and click "Save Custom Message" — all emails sent to batches will use this saved message.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-preview-custom-message"
            type="button"
            onClick={onOpenPreview}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Preview</span>
          </button>

          <button
            id="btn-save-custom-message"
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950 disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Message Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Custom Message'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title={isExpanded ? 'Collapse editor' : 'Expand editor'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Success banner if just saved */}
      {savedSuccess && (
        <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-300 font-semibold">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Custom message successfully saved! When you click "Dispatch Batch" or "Dispatch Emails", students in {activeBatchId ? `batch ${activeBatchId}` : 'new batches'} will receive this exact message.
          </span>
        </div>
      )}

      {/* Content Area */}
      {isExpanded ? (
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Subject */}
            <div className="md:col-span-2">
              <label htmlFor="custom-msg-subject" className="text-xs font-semibold text-slate-300 block mb-1">
                Email Subject Line
              </label>
              <input
                id="custom-msg-subject"
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500"
                placeholder="e.g. Welcome to Codeneksa — Your Student ID {{studentId}}"
              />
            </div>

            {/* Sender Name */}
            <div>
              <label htmlFor="custom-msg-sender-name" className="text-xs font-semibold text-slate-300 block mb-1">
                Sender Display Name
              </label>
              <input
                id="custom-msg-sender-name"
                type="text"
                required
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Dynamic Variable Chips */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1.5 text-indigo-300">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Click to Insert Variable Tag into Message:
              </span>
              <span className="text-slate-500 text-[10px]">Auto-replaced for each student</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => handleInsertVariable(v.key)}
                  title={v.description}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-indigo-950/80 border border-slate-700/70 hover:border-indigo-500 text-indigo-300 font-mono text-[11px] transition-all cursor-pointer"
                >
                  {v.key}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message Body Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="custom-msg-body" className="text-xs font-semibold text-slate-300">
                Custom Message Body
              </label>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Standard</span>
              </button>
            </div>
            <textarea
              id="custom-msg-body"
              ref={textareaRef}
              required
              rows={8}
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500 scrollbar-thin"
              placeholder="Write your custom message here. Include variables like {{studentName}}, {{studentId}}, {{batchId}}..."
            />
            <p className="text-[11px] text-slate-500 mt-1">
              All line breaks and paragraphs will be cleanly formatted into responsive HTML email with your official institutional styling.
            </p>
          </div>

          {/* Bottom Save bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Clicking <strong>Save Custom Message</strong> applies this message to all batch dispatches.</span>
            </div>

            <button
              id="btn-bottom-save-custom-message"
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950 disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Custom Message'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Collapsed quick view */
        <div className="p-4 flex items-center justify-between gap-4 text-xs">
          <div className="space-y-1 truncate">
            <div className="text-slate-300 font-medium truncate">
              <span className="text-slate-500">Subject: </span>
              {formData.subject}
            </div>
            <p className="text-slate-500 text-[11px] truncate">
              {formData.body.split('\n')[0]}...
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs shrink-0 flex items-center gap-1.5 transition-colors"
          >
            <FileEdit className="w-3.5 h-3.5 text-indigo-400" />
            <span>Edit Custom Message</span>
          </button>
        </div>
      )}
    </div>
  );
};
