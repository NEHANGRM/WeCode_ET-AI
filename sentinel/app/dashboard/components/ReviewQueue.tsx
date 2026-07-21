'use client';
import React, { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { AlertCircle, UserCheck, XCircle, CheckCircle, Globe, Brain, ExternalLink } from 'lucide-react';
import { ConfidenceBadge } from './ConfidenceBadge';
import Link from 'next/link';

const ACTION_MAP: Record<string, string> = {
  block_ip: '🔴 Block IP',
  isolate_segment: '🟠 Isolate Segment',
  alert_human: '🟡 Alert Human',
  open_ticket: '🔵 Open Ticket',
  failover: '🟣 Failover',
  none: '⚪ No Action',
};

export function ReviewQueue({ reviews }: { reviews: any[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [processed, setProcessed] = useState<Set<string>>(new Set());

  const handleAction = async (id: string, action: 'approve' | 'dismiss') => {
    setLoading(id);
    try {
      await fetch(`/api/events/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      setProcessed(p => new Set([...p, id]));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const activeReviews = reviews.filter(r => !processed.has(r.id));

  if (!activeReviews || activeReviews.length === 0) {
    return (
      <GlassPanel title="Human Review Queue" icon={<UserCheck className="w-4 h-4" />}>
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <CheckCircle className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">No items pending review.</p>
          <p className="text-xs mt-1 text-gray-500">Ambiguous cases will appear here.</p>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel
      title={`Review Queue (${activeReviews.length})`}
      icon={<AlertCircle className="w-4 h-4 text-amber-400" />}
      className="border-amber-500/20"
    >
      <div className="space-y-4">
        {activeReviews.map(review => (
          <div key={review.id} className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-xs font-mono text-[var(--color-text-muted)] mb-0.5">{review.id?.substring(0, 8)}...</div>
                <div className="font-semibold text-[var(--color-text-primary)] font-mono">{review.ip}</div>
                {review.mitre_technique && (
                  <div className="text-xs text-amber-400 font-mono mt-0.5">{review.mitre_technique.split(' ')[0]}</div>
                )}
              </div>
              <ConfidenceBadge score={review.score} />
            </div>

            {/* Suggested action */}
            {review.recommended_action && (
              <div className="text-xs text-[var(--color-text-secondary)] mb-2 bg-white/5 px-2 py-1 rounded-lg">
                <span className="text-[var(--color-text-muted)]">Judge recommends:</span>{' '}
                <span className="font-semibold text-[var(--color-text-primary)]">{ACTION_MAP[review.recommended_action] || review.recommended_action}</span>
              </div>
            )}

            {/* Threat intel summary */}
            {(review.abuseIpdbResult || review.virusTotalResult || review.greyNoiseResult) && (
              <div className="flex gap-2 mb-2">
                {review.abuseIpdbResult && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${review.abuseIpdbResult.score > 50 ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                    AIPDB:{review.abuseIpdbResult.score}%
                  </span>
                )}
                {review.virusTotalResult && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${review.virusTotalResult.maliciousCount > 0 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                    VT:{review.virusTotalResult.maliciousCount}/{review.virusTotalResult.totalEngines}
                  </span>
                )}
                {review.greyNoiseResult && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${review.greyNoiseResult.classification === 'malicious' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                    GN:{review.greyNoiseResult.classification}
                  </span>
                )}
              </div>
            )}

            {/* Judge reasoning */}
            <p className="text-xs text-[var(--color-text-secondary)] mb-3 leading-relaxed">
              <span className="text-amber-400 font-semibold">Judge: </span>{review.reason}
            </p>

            {/* Plain English */}
            {review.plainEnglishSummary && (
              <p className="text-xs text-[var(--color-text-muted)] mb-3 italic border-l-2 border-amber-500/40 pl-2">
                &quot;{review.plainEnglishSummary}&quot;
              </p>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                className="gap-1 flex-1 text-xs"
                onClick={() => handleAction(review.id, 'approve')}
                disabled={loading === review.id}
              >
                <CheckCircle className="w-3 h-3" /> Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 flex-1 text-xs text-[var(--color-text-muted)] hover:text-red-500"
                onClick={() => handleAction(review.id, 'dismiss')}
                disabled={loading === review.id}
              >
                <XCircle className="w-3 h-3" /> Dismiss
              </Button>
            </div>

            <Link href={`/cases`} className="text-xs text-[var(--color-accent)] hover:text-white flex items-center gap-1 mt-2">
              <ExternalLink className="w-3 h-3" /> View full evidence trail
            </Link>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
