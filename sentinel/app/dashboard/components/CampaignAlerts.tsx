'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, ChevronDown, ChevronUp, RefreshCw, Loader2, ShieldAlert, CheckCircle2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Campaign {
  _id: string;
  campaign_id: string;
  detected_at: string;
  confidence: number;
  attack_chain_narrative: string;
  mitre_chain: string[];
  involved_case_ids: string[];
  status: 'active' | 'resolved' | 'false_positive';
  reasoning: string;
  source_group?: string;
}

export function CampaignAlerts() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<string>('');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns', { cache: 'no-store' });
      const text = await res.text();
      if (text && text.trim()) {
        const data = JSON.parse(text);
        setCampaigns(Array.isArray(data) ? data : []);
      }
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 30000);
    return () => clearInterval(interval);
  }, [fetchCampaigns]);

  const handleRunCorrelator = async () => {
    setRunning(true);
    setRunResult('');
    try {
      const res = await fetch('/api/campaigns/run', { method: 'POST' });
      const text = await res.text();
      if (text && text.trim()) {
        const data = JSON.parse(text);
        if (data.success) {
          setRunResult(data.message || `${data.campaigns_detected} campaign(s) detected`);
          await fetchCampaigns();
        } else {
          setRunResult(data.error || 'Correlator returned no results');
        }
      }
    } catch {
      setRunResult('Unable to reach correlator — please try again');
    } finally {
      setRunning(false);
      setTimeout(() => setRunResult(''), 6000);
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-400" />
            Campaign Alerts
            {activeCampaigns.length > 0 && (
              <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full animate-pulse">
                {activeCampaigns.length} ACTIVE
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {runResult && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              {runResult}
            </span>
          )}
          <Button
            onClick={handleRunCorrelator}
            disabled={running}
            variant="secondary"
            size="sm"
            className="gap-2 text-xs"
          >
            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Run Correlation
          </Button>
        </div>
      </div>

      {/* No campaigns state */}
      {!loading && campaigns.length === 0 && (
        <div className="bg-gray-500/5 border border-white/5 rounded-xl p-4 text-center">
          <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm text-[var(--color-text-muted)]">No campaigns detected yet.</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Run the AIIMS replay first, then click <span className="text-orange-400 font-medium">"Run Correlation"</span> to detect multi-stage attack campaigns.
          </p>
        </div>
      )}

      {/* Campaign Cards */}
      <AnimatePresence>
        {activeCampaigns.map(campaign => (
          <motion.div
            key={campaign.campaign_id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-red-950/40 to-orange-950/30 border border-red-500/30 rounded-xl overflow-hidden shadow-lg shadow-red-950/20"
          >
            {/* Campaign Header */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-2 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-red-400 font-mono">{campaign.campaign_id}</span>
                      <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/20 px-2 py-0.5 rounded">
                        {campaign.confidence}% confidence
                      </span>
                      {campaign.source_group && (
                        <span className="text-xs bg-white/5 text-gray-400 border border-white/10 px-2 py-0.5 rounded">
                          {campaign.source_group}
                        </span>
                      )}
                    </div>
                    {/* MITRE Chain */}
                    {campaign.mitre_chain?.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {campaign.mitre_chain.map((t, i) => (
                          <React.Fragment key={t}>
                            <span className="text-xs bg-orange-950/60 text-orange-300 border border-orange-500/20 px-2 py-0.5 rounded font-mono">
                              {t}
                            </span>
                            {i < campaign.mitre_chain.length - 1 && (
                              <span className="text-orange-600 text-xs">→</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(expanded === campaign.campaign_id ? null : campaign.campaign_id)}
                  className="text-gray-500 hover:text-white transition-colors shrink-0 p-1"
                >
                  {expanded === campaign.campaign_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Expanded Detail */}
            <AnimatePresence>
              {expanded === campaign.campaign_id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-red-500/10 pt-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">Attack Chain Narrative</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{campaign.attack_chain_narrative}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">Reasoning</p>
                      <p className="text-xs text-gray-400 leading-relaxed">{campaign.reasoning}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">
                        Involved Cases ({campaign.involved_case_ids?.length || 0}) — Chronological
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {campaign.involved_case_ids?.map((caseId: string, idx: number) => (
                          <a
                            key={caseId}
                            href={`/cases?highlight=${caseId}`}
                            className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/30 text-gray-300 hover:text-orange-300 px-2.5 py-1.5 rounded-lg transition-all duration-200 group"
                          >
                            <Link2 className="w-3 h-3 text-orange-500 group-hover:text-orange-300" />
                            <span className="font-mono">Case #{idx + 1}</span>
                            <span className="text-gray-600 group-hover:text-gray-400">
                              {typeof caseId === 'string' ? caseId.substring(0, 8) : ''}...
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-gray-500">
                        Detected: {new Date(campaign.detected_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Resolved campaigns (collapsed) */}
      {campaigns.filter(c => c.status !== 'active').length > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {campaigns.filter(c => c.status !== 'active').length} resolved/false-positive campaign(s) in history
        </div>
      )}
    </div>
  );
}
