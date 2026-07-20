import React, { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { AlertCircle, UserCheck, XCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { ConfidenceBadge } from './ConfidenceBadge';

export function ReviewQueue({ reviews }: { reviews: any[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (id: string, action: string) => {
    setLoading(id);
    try {
      await fetch(`/api/events/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  if (!reviews || reviews.length === 0) {
    return (
      <GlassPanel title="Review Queue" icon={<UserCheck className="w-4 h-4" />}>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <CheckCircle className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-sm">No items needing human review.</p>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel 
      title="Review Queue (Human In Loop)" 
      icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
      className="border-amber-500/20"
    >
      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="bg-white/5 rounded-lg p-4 border border-white/5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm font-mono text-gray-400 mb-1">
                  {review.id.substring(0,8)}... • {review.time}
                </div>
                <div className="font-semibold text-white tracking-wide">{review.ip}</div>
              </div>
              <ConfidenceBadge score={review.score} />
            </div>
            
            <p className="text-sm text-gray-300 mb-4 bg-black/20 p-3 rounded border border-white/5">
              <span className="text-amber-400 font-medium text-xs uppercase tracking-wider block mb-1">Judge Reasoning</span>
              {review.reason}
            </p>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant="primary" 
                className="gap-1.5 flex-1 md:flex-none"
                onClick={() => handleAction(review.id, 'approve')}
                disabled={loading === review.id}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve Action
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="gap-1.5 text-gray-400 hover:text-red-400"
                onClick={() => handleAction(review.id, 'dismiss')}
                disabled={loading === review.id}
              >
                <XCircle className="w-3.5 h-3.5" /> Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
