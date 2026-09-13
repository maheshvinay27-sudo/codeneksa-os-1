import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  Check,
  Send,
  HelpCircle,
} from 'lucide-react';
import { EmailTemplate, Student } from '../../types';
import { TEMPLATE_VARIABLES, DEFAULT_WELCOME_TEMPLATE } from '../../services/emailTemplateService';

interface WelcomeMailTemplateEditorProps {
  template: EmailTemplate;
  onSaveTemplate: (template: EmailTemplate) => Promise<void>;
  onOpenPreviewModal: () => void;
  sampleStudent?: Student | null;
}

export const WelcomeMailTemplateEditor: React.FC<WelcomeMailTemplateEditorProps> = ({
  template,
  onSaveTemplate,
  onOpenPreviewModal,
}) => {
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

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 50);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset template content to official Codeneksa standard default?')) {
      setFormData({
        ...DEFAULT_WELCOME_TEMPLATE,
        id: template.id || DEFAULT_WELCOME_TEMPLATE.id,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveTemplate(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save template:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      id="welcome-mail-template-editor"
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Welcome Email Template Editor</h3>
            <p className="text-xs text-slate-400">
              Customize subject and personalized variables for all student welcome communications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-preview-template"
            type="button"
            onClick={onOpenPreviewModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Preview Rendered</span>
          </button>

          <button
            id="btn-reset-template"
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
            title="Reset to default template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            id="btn-save-template"
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950 disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Template'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Template Name */}
        <div>
          <label htmlFor="input-template-name" className="text-xs font-semibold text-slate-300 block mb-1">
            Template Name
          </label>
          <input
            id="input-template-name"
            type="text"
            required
            value={formData.templateName}
            onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Sender Name */}
        <div>
          <label htmlFor="input-sender-name" className="text-xs font-semibold text-slate-300 block mb-1">
            Sender Display Name
          </label>
          <input
            id="input-sender-name"
            type="text"
            required
            value={formData.senderName}
            onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Reply To */}
        <div>
          <label htmlFor="input-reply-to" className="text-xs font-semibold text-slate-300 block mb-1">
            Reply-To Email Address
          </label>
          <input
            id="input-reply-to"
            type="email"
            required
            value={formData.replyTo}
            onChange={(e) => setFormData({ ...formData, replyTo: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="input-template-subject" className="text-xs font-semibold text-slate-300 block mb-1">
          Email Subject Line
        </label>
        <input
          id="input-template-subject"
          type="text"
          required
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500"
          placeholder="e.g. Welcome to Codeneksa — Your Student ID {{studentId}}"
        />
      </div>

      {/* Variable Chips Inserter */}
      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Click Variable to Insert into Body:
          </span>
          <span className="text-slate-500">Auto-replaced during dispatch</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => handleInsertVariable(v.key)}
              title={v.description}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-indigo-950/70 border border-slate-700/70 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 font-mono text-[11px] transition-all cursor-pointer"
            >
              {v.key}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div>
        <label htmlFor="textarea-template-body" className="text-xs font-semibold text-slate-300 block mb-1">
          Email Body Text (Plain Text & Variable Markup)
        </label>
        <textarea
          id="textarea-template-body"
          ref={textareaRef}
          required
          rows={12}
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500 scrollbar-thin"
        />
        <p className="text-[11px] text-slate-500 mt-1">
          The email engine automatically transforms this template into a responsive HTML email with official Codeneksa letterhead styling.
        </p>
      </div>
    </form>
  );
};
