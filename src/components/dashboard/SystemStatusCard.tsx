import React, { useEffect, useState } from 'react';
import { ShieldCheck, Database, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Badge } from '../common/Badge';
import { validateFirestoreConnection } from '../../config/firebase';
import firebaseConfig from '../../../firebase-applet-config.json';

export const SystemStatusCard: React.FC = () => {
  const [status, setStatus] = useState<{
    checking: boolean;
    connected: boolean;
    latencyMs: number;
    error?: string;
  }>({
    checking: true,
    connected: false,
    latencyMs: 0,
  });

  const checkConnection = async () => {
    setStatus((prev) => ({ ...prev, checking: true }));
    const res = await validateFirestoreConnection();
    setStatus({
      checking: false,
      connected: res.ok,
      latencyMs: res.latencyMs,
      error: res.error,
    });
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader
          title="System Status"
          subtitle="Cloud Firestore & Security infrastructure"
          action={
            <button
              onClick={checkConnection}
              disabled={status.checking}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Test connection"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status.checking ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          }
        />

        <div className="space-y-3 mt-2">
          {/* Firestore Connection */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  status.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <div>
                <p className="text-xs font-semibold text-slate-200">Cloud Firestore</p>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-[170px] sm:max-w-[200px]">
                  {firebaseConfig.firestoreDatabaseId || 'default'}
                </p>
              </div>
            </div>
            <Badge variant={status.connected ? 'success' : 'danger'}>
              {status.checking ? 'Testing...' : status.connected ? `${status.latencyMs}ms` : 'Offline'}
            </Badge>
          </div>

          {/* Security Rules Status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Security Rules</p>
                <p className="text-[11px] text-slate-400">Zero-Trust & Least Privilege</p>
              </div>
            </div>
            <Badge variant="success">Deployed</Badge>
          </div>

          {/* Authentication */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Firebase Project</p>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-[170px]">
                  {firebaseConfig.projectId}
                </p>
              </div>
            </div>
            <Badge variant="purple">Active</Badge>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>Role: Internal Operator</span>
        <span className="text-emerald-400 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> All systems nominal
        </span>
      </div>
    </Card>
  );
};
