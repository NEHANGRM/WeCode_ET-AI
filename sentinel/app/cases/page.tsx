'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import {
  Folders, Globe, Brain, Network, Shield, CheckCircle,
  XCircle, AlertTriangle, ChevronDown, ChevronUp, Filter, Loader2
} from 'lucide-react';
import { ConfidenceBadge } from '../dashboard/components/ConfidenceBadge';

const STATUS_FILTERS = ['all', 'judged', 'responded', 'closed', 'investigating'];
const ACTION_LABELS: Record<string, string> = {
  block_ip: 'Block IP', isolate_segment: 'Isolate Segment',
  alert_human: 'Alert Human', open_ticket: 'Open Ticket',
  failover: 'Failover', none: 'No Action'
};

function RawIntelCard({ label, value, subValue, status }: any) {
  return (
    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
      <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">{label}</div>
      <div className={`text-xl font-bold font-mono ${status === 'danger' ? 'text-red-400' : status === 'warn' ? 'text-amber-400' : 'text-green-400'}`}>
        {value}
      </div>
      {subValue && <div className="text-xs text-gray-500 mt-0.5">{subValue}</div>}
    </div>
  );
}

function CaseDetail({ c, onApprove, onDismiss, loading }: any) {
  const [open, setOpen] = useState(false);

  const statusColor = c.status === 'responded' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
    c.status === 'judged' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
    c.status === 'closed' ? 'border-gray-500/30 text-gray-400 bg-gray-500/10' :
    'border-blue-500/30 text-blue-400 bg-blue-500/10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/3 border border-white/8 rounded-xl overflow-hidden"
    >
      {/* Case header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white">{c.ip}</span>
              {c.investigation?.attackCategoryGuess && (
                <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full border border-white/10">
                  {c.investigation.attackCategoryGuess.replace('_', ' ')}
                </span>
              )}
              {c.investigation?.mitre_technique && (
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {c.investigation.mitre_technique.split(' ')[0]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor}`}>{c.status}</span>
              <span className="text-xs text-gray-600">{new Date(c.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {c.judgment && <ConfidenceBadge score={c.judgment.confidence} />}
          {c.action && (
            <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded font-medium">
              ✓ {ACTION_LABELS[c.action.actionTaken] || c.action.actionTaken}
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </div>

      {/* Expanded evidence trail */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="p-4 space-y-5">

              {/* Signal */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Raw Signal</h4>
                <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-gray-400 border border-white/5">
                  <div><span className="text-gray-600">IP:</span> <span className="text-white">{c.ip}</span></div>
                  <div><span className="text-gray-600">Protocol:</span> {c.protocol}</div>
                  {c.reasonCode && <div><span className="text-gray-600">Rule:</span> <span className="text-amber-400">{c.reasonCode}</span></div>}
                  <div className="mt-2 text-gray-400">{c.payloadSummary}</div>
                  {c.target_asset && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <span className="text-gray-600">Target Asset:</span> <span className="text-blue-400">{c.target_asset.name}</span>
                      {' '}<span className="text-gray-600">({c.target_asset.asset_class})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Raw Threat Intel */}
              {c.investigation && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" /> Threat Intelligence — Raw API Responses
                    <span className="text-gray-700 font-normal">(live data — not paraphrased)</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <RawIntelCard
                      label="AbuseIPDB"
                      value={`${c.investigation.abuseIpdbResult?.score ?? 'N/A'}%`}
                      subValue={`${c.investigation.abuseIpdbResult?.categories?.length || 0} report categories`}
                      status={c.investigation.abuseIpdbResult?.score > 70 ? 'danger' : c.investigation.abuseIpdbResult?.score > 30 ? 'warn' : 'ok'}
                    />
                    <RawIntelCard
                      label="VirusTotal"
                      value={`${c.investigation.virusTotalResult?.maliciousCount ?? 0}/${c.investigation.virusTotalResult?.totalEngines ?? 94}`}
                      subValue="malicious / total engines"
                      status={c.investigation.virusTotalResult?.maliciousCount > 5 ? 'danger' : c.investigation.virusTotalResult?.maliciousCount > 0 ? 'warn' : 'ok'}
                    />
                    <RawIntelCard
                      label="GreyNoise"
                      value={c.investigation.greyNoiseResult?.classification || 'unknown'}
                      subValue={c.investigation.greyNoiseResult?.isTargeted ? '⚠ Targeted attack' : 'Background noise'}
                      status={c.investigation.greyNoiseResult?.classification === 'malicious' ? 'danger' : 'ok'}
                    />
                  </div>
                </div>
              )}

              {/* AI Synthesis */}
              {c.investigation?.aiSummary && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5" /> AI Investigator Synthesis
                    {c.investigation.mitre_technique && (
                      <span className="ml-auto font-mono text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {c.investigation.mitre_technique}
                      </span>
                    )}
                  </h4>
                  <div className="bg-blue-950/20 rounded-lg p-3 border border-blue-500/10 text-sm text-gray-300 leading-relaxed">
                    {c.investigation.aiSummary}
                  </div>
                  {c.investigation.evidence?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {c.investigation.evidence.map((ev: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                          <span className="text-blue-500 flex-shrink-0">▸</span>{ev}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* APT Correlation */}
              {c.investigation?.aptCorrelation?.aptSuspicion && (
                <div className="bg-amber-950/20 rounded-lg p-3 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Network className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-400">Correlator: APT Campaign Pattern Detected</span>
                    <span className="ml-auto text-xs font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                      APT Score: {c.investigation.aptCorrelation.aptScore}/100
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{c.investigation.aptCorrelation.reasoning}</p>
                  {c.investigation.aptCorrelation.mitreStage && (
                    <p className="text-xs text-amber-500 mt-1 font-mono">{c.investigation.aptCorrelation.mitreStage}</p>
                  )}
                </div>
              )}

              {/* Judge Decision */}
              {c.judgment && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Judge Decision</h4>
                  <div className={`rounded-lg p-3 border ${
                    c.judgment.verdict === 'confirmed_attack' ? 'bg-red-950/20 border-red-500/20' :
                    c.judgment.verdict === 'suspicious' ? 'bg-amber-950/20 border-amber-500/20' :
                    'bg-green-950/20 border-green-500/20'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold capitalize ${
                        c.judgment.verdict === 'confirmed_attack' ? 'text-red-400' :
                        c.judgment.verdict === 'suspicious' ? 'text-amber-400' : 'text-green-400'
                      }`}>{c.judgment.verdict?.replace('_', ' ')}</span>
                      <ConfidenceBadge score={c.judgment.confidence} />
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{c.judgment.reasoning}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">Recommended:</span>
                      <span className="text-white font-semibold">{ACTION_LABELS[c.judgment.recommended_action] || c.judgment.recommended_action}</span>
                      <span className="ml-auto font-mono text-gray-500">{c.judgment.mitre_attribution}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Responder Action */}
              {c.action && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" /> Responder Execution Log
                  </h4>
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5 font-mono text-xs space-y-1">
                    {c.action.executionLog?.map((line: string, i: number) => (
                      <div key={i} className={`${
                        line.startsWith('[EXECUTED]') ? 'text-green-400' :
                        line.startsWith('[Policy]') ? 'text-blue-400' :
                        line.startsWith('[BlastRadius]') ? 'text-amber-400' :
                        line.startsWith('[SIMULATED]') ? 'text-gray-600' :
                        'text-gray-500'
                      }`}>{line}</div>
                    ))}
                    {c.action.policyCheck && (
                      <div className={`mt-2 pt-2 border-t border-white/5 ${c.action.policyCheck.passed ? 'text-green-400' : 'text-orange-400'}`}>
                        Policy: {c.action.policyCheck.passed ? '✓ PASSED' : '⚠ OVERRIDE'} — {c.action.policyCheck.reason}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Plain English */}
              {c.judgment?.plainEnglishSummary && (
                <div className="bg-green-950/20 rounded-lg p-3 border border-green-500/10">
                  <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-1.5">
                    For Hospital Administration / Plant Manager
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed italic">"{c.judgment.plainEnglishSummary}"</p>
                </div>
              )}

              {/* Human review actions */}
              {c.status === 'judged' && c.judgment?.escalatedToHuman && (
                <div className="flex gap-3 pt-2 border-t border-white/5">
                  <Button
                    variant="primary" size="sm"
                    className="gap-2 flex-1"
                    onClick={() => onApprove(c.id)}
                    disabled={loading === c.id}
                  >
                    {loading === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve & Execute
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="gap-2 text-red-400 hover:text-red-300"
                    onClick={() => onDismiss(c.id)}
                    disabled={loading === c.id}
                  >
                    <XCircle className="w-4 h-4" /> Dismiss
                  </Button>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const fetchCases = async () => {
    try {
      const url = filter === 'all' ? '/api/cases' : `/api/cases?status=${filter}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      setCases(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCases(); }, [filter]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/cases/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      await fetchCases();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/cases/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' })
      });
      await fetchCases();
    } finally {
      setActionLoading(null);
    }
  };

  const pendingReview = cases.filter(c => c.status === 'judged' && c.judgment?.escalatedToHuman).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-wide text-white flex items-center gap-3">
                <Folders className="w-6 h-6 text-blue-400" />
                Case Review
                {pendingReview > 0 && (
                  <span className="text-sm bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                    {pendingReview} awaiting review
                  </span>
                )}
              </h2>
              <p className="text-gray-500 text-sm mt-1">Full evidence trail for every flagged event. Raw API responses shown verbatim.</p>
            </div>
            <Button onClick={fetchCases} variant="ghost" size="sm" className="gap-2 text-gray-400">
              <Filter className="w-4 h-4" /> Refresh
            </Button>
          </div>

          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  filter === f
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'text-gray-500 border-white/10 hover:text-gray-300 hover:border-white/20'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-20 text-gray-600">
              <Folders className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No cases found. Run the AIIMS replay to generate cases.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map(c => (
                <CaseDetail
                  key={c.id}
                  c={c}
                  onApprove={handleApprove}
                  onDismiss={handleDismiss}
                  loading={actionLoading}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
