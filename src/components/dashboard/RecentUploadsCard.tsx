import React, { useEffect, useState } from 'react';
import { UploadCloud, FileSpreadsheet, FolderKanban, Users, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Batch } from '../../types';
import { fetchAllBatches } from '../../services/batchService';

interface RecentUploadsCardProps {
  onUploadClick?: () => void;
  onViewBatch?: (batchId: string) => void;
  refreshTrigger?: number;
}

export const RecentUploadsCard: React.FC<RecentUploadsCardProps> = ({
  onUploadClick,
  onViewBatch,
  refreshTrigger = 0,
}) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadBatches = async () => {
      setLoading(true);
      try {
        const list = await fetchAllBatches();
        if (isMounted) {
          // Take first 5 recent batches
          setBatches(list.slice(0, 5));
        }
      } catch (err) {
        console.warn('Could not load recent batches:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBatches();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Recent Student Data Uploads"
        subtitle="Spreadsheet cohorts processed by The Data Employee"
        action={
          onUploadClick && (
            <Button
              variant="primary"
              size="sm"
              onClick={onUploadClick}
              className="text-xs"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
              Upload Student Data
            </Button>
          )
        }
      />

      {loading ? (
        <div className="py-12 flex justify-center items-center text-xs text-slate-500">
          Loading recent uploads...
        </div>
      ) : batches.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center">
          <EmptyState
            icon={<FileSpreadsheet className="w-6 h-6" />}
            title="No student batches uploaded yet"
            description="The Data Employee is ready to ingest, validate, and store student cohorts from Excel and CSV spreadsheets."
            actionLabel={onUploadClick ? 'Upload Student Data' : undefined}
            onAction={onUploadClick}
          />
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="py-3 px-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-900/40 rounded-xl transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">{batch.name}</span>
                    <Badge variant="purple" size="sm">
                      {batch.code || batch.batchId || batch.id}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{batch.collegeName || 'Main Campus'}</span>
                    <span>•</span>
                    <span>{batch.courseTitle || 'Curriculum'}</span>
                    {batch.sourceFileName && (
                      <>
                        <span>•</span>
                        <span className="text-slate-500 truncate max-w-[140px]">
                          {batch.sourceFileName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-semibold flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {batch.studentCount ?? 0} students
                </span>

                {onViewBatch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewBatch(batch.id)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    View
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
