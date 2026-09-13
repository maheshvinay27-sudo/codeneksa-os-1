import React from 'react';
import { Activity, Clock, User, CheckCircle, Upload, Shield, Mail, Award, BookOpen, Building2 } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { ActivityLog } from '../../types';

interface RecentActivityListProps {
  activities: ActivityLog[];
  isLoading?: boolean;
}

export const RecentActivityList: React.FC<RecentActivityListProps> = ({
  activities,
  isLoading = false,
}) => {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'STUDENT_DATA_UPLOADED':
        return <Upload className="w-3.5 h-3.5 text-sky-400" />;
      case 'STUDENT_IDS_GENERATED':
        return <Shield className="w-3.5 h-3.5 text-indigo-400" />;
      case 'WELCOME_EMAILS_SENT':
        return <Mail className="w-3.5 h-3.5 text-emerald-400" />;
      case 'CERTIFICATES_GENERATED':
        return <Award className="w-3.5 h-3.5 text-amber-400" />;
      case 'COURSE_CREATED':
        return <BookOpen className="w-3.5 h-3.5 text-purple-400" />;
      case 'BATCH_CREATED':
        return <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />;
      case 'COLLEGE_ADDED':
        return <Building2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'USER_LOGIN':
        return <User className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return ts;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Recent Activity"
        subtitle="Automated operations and administrative audit stream"
      />

      <div className="flex-1">
        {activities.length === 0 ? (
          <EmptyState
            icon={<Activity className="w-6 h-6" />}
            title="No operational logs yet"
            description="As automated tasks, student uploads, and logins occur, your operational audit trail will stream here in real-time."
          />
        ) : (
          <div className="space-y-2.5">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-slate-700/60 transition-colors"
              >
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                  {getActionIcon(act.actionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 leading-snug break-words">
                    {act.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(act.timestamp)}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-slate-400 truncate max-w-[140px]">
                      {act.performedByEmail || 'System'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
