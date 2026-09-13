import React, { useState, useEffect } from 'react';
import { Building2, Plus, Mail, Phone, MapPin, CheckCircle, ExternalLink } from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { College } from '../types';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNotification } from '../context/NotificationContext';
import { recordActivity } from '../services/dashboardService';

export const CollegesPage: React.FC = () => {
  const { success, error } = useNotification();
  const [colleges, setColleges] = useState<College[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const fetchColleges = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'colleges'));
      const list: College[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<College, 'id'>) });
      });
      setColleges(list);
    } catch (err) {
      console.warn('Colleges fetch error:', err);
      setColleges([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      error('Validation Error', 'College name and code are required.');
      return;
    }

    setSubmitting(true);
    try {
      const nowStr = new Date().toISOString();
      await addDoc(collection(db, 'colleges'), {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        contactEmail: email.trim() || undefined,
        contactPhone: phone.trim() || undefined,
        address: address.trim() || undefined,
        active: true,
        createdAt: nowStr,
        updatedAt: nowStr,
      });

      await recordActivity({
        actionType: 'COLLEGE_ADDED',
        description: `Registered partner college: ${name.trim()} (${code.trim().toUpperCase()})`,
        category: 'academic',
        metadata: { collegeCode: code.trim().toUpperCase() },
      });

      success('College Registered', `${name} (${code}) has been added to Cloud Firestore.`);
      setName('');
      setCode('');
      setEmail('');
      setPhone('');
      setAddress('');
      setModalOpen(false);
      fetchColleges();
    } catch (err: unknown) {
      error('Error', err instanceof Error ? err.message : 'Could not add college.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Partner Colleges</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Academic institutions participating in Codeneksa training & certifications
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
        >
          Add College
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Colleges Directory"
          subtitle="Directly linked to Cloud Firestore collection: /colleges"
          action={
            <Badge variant="purple" size="md">
              Total: {colleges.length}
            </Badge>
          }
        />

        {colleges.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-7 h-7" />}
            title="No partner colleges registered yet"
            description="Start building your institution directory by registering partner universities or colleges. Each college has an institutional code used for batch assignments."
            actionLabel="Register First College"
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {colleges.map((col) => (
              <div
                key={col.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                      {col.code}
                    </span>
                    <Badge variant={col.active ? 'success' : 'neutral'}>
                      {col.active ? 'Active Partner' : 'Archived'}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2.5 leading-snug">{col.name}</h4>
                  {col.address && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {col.address}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  {col.contactEmail && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      {col.contactEmail}
                    </p>
                  )}
                  {col.contactPhone && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      {col.contactPhone}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add College Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register Partner College"
        description="Add a new partner university or engineering college to Cloud Firestore"
      >
        <form onSubmit={handleAddCollege} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              College Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sreenidhi Institute of Science and Technology"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Institution Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SNIST"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono uppercase focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Official Contact Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dean@snist.edu"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Campus Location / Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ghatkesar, Hyderabad, Telangana"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Save to Firestore
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
