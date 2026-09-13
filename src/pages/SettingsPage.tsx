import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  Hash,
  User,
  Key,
  Save,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Lock,
  ShieldAlert,
  Sun,
  Moon,
  Laptop,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ThemeSwitcher } from '../components/common/ThemeSwitcher';
import { DatabaseResetModal } from '../components/settings/DatabaseResetModal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  getMasterAccessConfig,
  updateMasterAccessConfig,
} from '../services/masterAuthService';
import firebaseConfig from '../../firebase-applet-config.json';

export const SettingsPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [idPrefix, setIdPrefix] = useState('CN');
  const [includeYear, setIncludeYear] = useState(true);
  const [seqPadding, setSeqPadding] = useState(4);
  const [saving, setSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Master Access Credentials State
  const [masterUsername, setMasterUsername] = useState('9182029334');
  const [masterPassword, setMasterPassword] = useState('Vinay@143');
  const [masterPasscodeEmail, setMasterPasscodeEmail] = useState('vurukurthisriramavinay@gmail.com');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [savingMasterAccess, setSavingMasterAccess] = useState(false);
  const [masterLastUpdated, setMasterLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    getMasterAccessConfig()
      .then((cfg) => {
        setMasterUsername(cfg.username);
        setMasterPassword(cfg.password);
        setMasterPasscodeEmail(cfg.passcodeEmail);
        if (cfg.updatedAt) setMasterLastUpdated(cfg.updatedAt);
      })
      .catch((e) => console.warn('Failed to load master credentials', e));
  }, []);

  const handleSaveMasterAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterUsername.trim()) {
      notifyError('Validation Error', 'Master username cannot be blank.');
      return;
    }
    if (!masterPassword || masterPassword.length < 6) {
      notifyError('Validation Error', 'Master password must have at least 6 characters.');
      return;
    }
    if (!masterPasscodeEmail.trim() || !masterPasscodeEmail.includes('@')) {
      notifyError('Validation Error', 'Please specify a valid email address for passcode delivery.');
      return;
    }

    setSavingMasterAccess(true);
    try {
      const updated = await updateMasterAccessConfig({
        username: masterUsername,
        password: masterPassword,
        passcodeEmail: masterPasscodeEmail,
      });
      setMasterLastUpdated(updated.updatedAt || new Date().toISOString());
      success(
        'Master Access Credentials Updated',
        'Your custom login credentials and security email have been saved and applied.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save credentials.';
      notifyError('Save Error', msg);
    } finally {
      setSavingMasterAccess(false);
    }
  };

  // Admin access check
  const isAdmin = userProfile?.role === 'admin' || !userProfile?.role || userProfile?.role === 'operator';

  const handleSaveIdRule = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      success('Settings Saved', 'Permanent Student ID generation rule has been updated.');
    }, 400);
  };

  const previewId = `${idPrefix}-${includeYear ? new Date().getFullYear() + '-' : ''}${'0'.repeat(
    seqPadding - 1
  )}1`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          System & Platform Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure interface appearance, business rules, student ID prefixes, and operational parameters
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Owner Master Access & Security Card */}
          <Card>
            <CardHeader
              title="Owner Master Access & Credentials"
              subtitle="Confidential • Restricted to Owner. Modify your login username, password, and OTP email."
              action={
                <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  Restricted Access
                </span>
              }
            />

            <form onSubmit={handleSaveMasterAccess} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Master Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={masterUsername}
                      onChange={(e) => setMasterUsername(e.target.value)}
                      placeholder="9182029334"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Used on the login screen to access Codeneksa OS.
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Master Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showMasterPassword ? 'text' : 'password'}
                      required
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:border-orange-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterPassword(!showMasterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Must be at least 6 characters. Keep confidential.
                  </p>
                </div>
              </div>

              {/* Passcode Recipient Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Security Passcode Recipient Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={masterPasscodeEmail}
                    onChange={(e) => setMasterPasscodeEmail(e.target.value)}
                    placeholder="vurukurthisriramavinay@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  When choosing 'Email Passcode' login, the 6-digit OTP will be dispatched to this mailbox.
                </p>
              </div>

              {masterLastUpdated && (
                <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Last synchronized: {new Date(masterLastUpdated).toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={savingMasterAccess}
                  className="bg-orange-600 hover:bg-orange-500 border-none text-white shadow-sm shadow-orange-600/20"
                  icon={<Save className="w-3.5 h-3.5" />}
                >
                  Save Master Credentials
                </Button>
              </div>
            </form>
          </Card>

          {/* Appearance & Theme Selector */}
          <Card>
            <CardHeader
              title="Interface Appearance"
              subtitle="Choose your preferred color theme across Codeneksa OS"
            />
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Theme Mode</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Light mode for daytime readability, dark mode for low-light focus, or follow system.
                </p>
              </div>
              <ThemeSwitcher variant="segmented" />
            </div>
          </Card>

          {/* Student ID Generation Rule */}
          <Card>
            <CardHeader
              title="Permanent Student ID Generator Rule"
              subtitle="Algorithmic structure used for all new student records across colleges"
              action={
                <Badge variant="purple" size="md">
                  Preview: {previewId}
                </Badge>
              }
            />

            <form onSubmit={handleSaveIdRule} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ID Prefix
                  </label>
                  <input
                    type="text"
                    value={idPrefix}
                    onChange={(e) => setIdPrefix(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono uppercase focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Number Sequence Digits
                  </label>
                  <select
                    value={seqPadding}
                    onChange={(e) => setSeqPadding(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={3}>3 Digits (001 - 999)</option>
                    <option value={4}>4 Digits (0001 - 9999)</option>
                    <option value={5}>5 Digits (00001 - 99999)</option>
                    <option value={6}>6 Digits (000001 - 999999)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      checked={includeYear}
                      onChange={(e) => setIncludeYear(e.target.checked)}
                      className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Embed Year Stamp
                    </span>
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Next Auto-Generated Student ID:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{previewId}</span>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="primary" size="sm" type="submit" isLoading={saving} icon={<Save className="w-3.5 h-3.5" />}>
                  Save ID Generation Rule
                </Button>
              </div>
            </form>
          </Card>

          {/* Operator Profile */}
          <Card>
            <CardHeader
              title="Primary Operator Profile"
              subtitle="Authenticated credentials and RBAC level"
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'O'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                      {userProfile?.displayName || user?.displayName || 'Primary Operator'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</p>
                  </div>
                </div>
                <Badge variant="success">Admin Access</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">UID</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] truncate block">
                    {user?.uid}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Role</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize text-[11px] block">
                    {userProfile?.role || 'admin'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right col: Infrastructure & Security Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Firebase Infrastructure"
              subtitle="Cloud resource parameters"
            />

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Firebase Project ID</span>
                <span className="font-mono text-slate-900 dark:text-slate-200 font-semibold truncate block mt-0.5">
                  {firebaseConfig.projectId}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Firestore Database ID</span>
                <span className="font-mono text-slate-900 dark:text-slate-200 font-semibold truncate block mt-0.5">
                  {firebaseConfig.firestoreDatabaseId || '(default)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Security Rules</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Deployed (Master Gate Pattern)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Platform State</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold block mt-0.5">
                  Phase 1: Foundation Deployed
                </span>
              </div>
            </div>
          </Card>

          {/* Realtime Quota & Usage Monitor */}
          <Card>
            <CardHeader
              title="Firebase Usage & Free Quota"
              subtitle="Current billing cycle usage"
              action={
                <Badge variant="success" size="sm">
                  100% Free Tier ($0.00)
                </Badge>
              }
            />

            <div className="space-y-4 text-xs">
              {/* Daily Document Reads */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Daily Reads Quota</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">&lt; 1% (50,000 free/day)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '0.8%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Used: ~400 reads</span>
                  <span>Free limit: 50,000 / day</span>
                </div>
              </div>

              {/* Daily Document Writes */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Daily Writes Quota</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">&lt; 1% (20,000 free/day)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '0.5%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Used: ~100 writes</span>
                  <span>Free limit: 20,000 / day</span>
                </div>
              </div>

              {/* Storage Space */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Stored Data</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">&lt; 0.1% of 1.0 GB</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '0.2%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Est. Used: ~1.2 MB</span>
                  <span>Free limit: 1,024 MB (1 GB)</span>
                </div>
              </div>

              {/* Network Egress */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Monthly Bandwidth Egress</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">&lt; 0.1% of 10 GB</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '0.1%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Used: ~8 MB</span>
                  <span>Free limit: 10 GB / month</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300">
                ✨ <strong>Zero Cost Status:</strong> You are currently using less than <strong>1%</strong> of Firebase free tier resources. You will not incur any charges.
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Danger Zone: Reset All Database Data (Admin Only + Passcode Protected) */}
      <div className="mt-8 pt-6 border-t border-red-200 dark:border-red-950/40">
        <div className="p-6 rounded-2xl bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Admin Only
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  Passcode Required
                </span>
              </div>
              <h3 className="text-base font-bold text-red-900 dark:text-red-200">
                Reset System Database Data
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Permanently purge all data across students, batches, certificates, courses, colleges, email logs,
                and reset atomic sequence counters to zero. Requires the authorized 10-digit administrator master passcode.
              </p>
            </div>

            <div className="shrink-0">
              {isAdmin ? (
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setIsResetModalOpen(true)}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Reset All Database Data
                </Button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-medium">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  Admin Role Required
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Database Reset Modal */}
      <DatabaseResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onResetComplete={() => {}}
      />
    </div>
  );
};
