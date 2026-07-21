'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Badge } from '@/components/ui/Badge';
import {
  ChevronDown, ChevronUp, ShieldAlert, Globe, Activity,
  Network, ExternalLink, CheckCircle, XCircle, Brain, Zap
} from 'lucide-react';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  block_ip: { label: 'Block IP', color: 'text-red-400' },
  isolate_segment: { label: 'Isolate Segment', color: 'text-orange-400' },
  alert_human: { label: 'Alert Human', color: 'text-amber-400' },
  open_ticket: { label: 'Open Ticket', color: 'text-blue-400' },
  failover: { label: 'Failover', color: 'text-purple-400' },
  none: { label: 'No Action', color: 'text-gray-400' },
  alert_oncall: { label: 'Alert On-Call', color: 'text-amber-400' },
};

const CATEGORY_COLORS: Record<string, string> = {
  ddos: 'text-red-400 bg-red-500/10 border-red-500/20',
  bruteforce: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  ransomware_staging: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  exfiltration: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  apt_campaign: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  ot_intrusion: 'text-red-500 bg-red-500/15 border-red-500/30',
  unknown: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

export function EventCard({ event }: { event: any }) {
  const [expanded, setExpanded] = useState(false);
  const catColors = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.unknown;
  const actionInfo = ACTION_LABELS[event.actionTaken || event.recommended_action || ''] || null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      layout
    >
      <GlassPanel className={`mb-0 transition-all duration-300 ${
        event.status === 'responded' ? 'hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] border-l-4 border-l-green-500' :
        event.status === 'judged' ? 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] border-l-4 border-l-amber-500' :
        event.status === 'closed' ? 'hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] border-l-4 border-l-gray-600' :
        'hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] border-l-4 border-l-red-500'
      }`}>
        {/* Main row */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border flex-shrink-0 ${
              event.status === 'responded' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
              event.status === 'judged' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              event.status === 'closed' ? 'bg-gray-500/10 border-gray-500/20 text-gray-500' :
              'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-base font-bold text-white">{event.ip}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${catColors}`}>
                  {event.category?.replace('_', ' ') || 'unknown'}
                </span>
                {event.reasonCode && (
                  <span className="text-xs text-gray-500 font-mono bg-white/5 px-2 py-0.5 rounded">
                    {event.reasonCode}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                  event.status === 'responded' ? 'text-green-400 bg-green-500/10' :
                  event.status === 'judged' ? 'text-amber-400 bg-amber-500/10' :
                  event.status === 'investigating' ? 'text-blue-400 bg-blue-500/10' :
                  event.status === 'closed' ? 'text-gray-400 bg-gray-500/10' :
                  'text-gray-400 bg-gray-500/10'
                }`}>{event.status}</span>
                {event.time && <span className="text-xs text-gray-600">{event.time}</span>}
                {event.mitre_technique && (
                  <span className="text-xs text-gray-500 font-mono">{event.mitre_technique.split(' ')[0]}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:flex-shrink-0">
            {event.score !== null && event.score !== undefined && (
              <ConfidenceBadge score={event.score} />
            )}
            {actionInfo && (
              <span className={`text-xs font-semibold ${actionInfo.color} hidden sm:block`}>
                → {actionInfo.label}
              </span>
            )}
            <button className="p-1 hover:bg-white/10 rounded text-gray-500">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-white/5 space-y-4">

                {/* Payload summary */}
                {event.payloadSummary && (
                  <div className="bg-black/30 rounded-lg p-3 border border-white/5 font-mono text-xs text-gray-400">
                    <span className="text-gray-600 block mb-1 uppercase text-[10px] tracking-wider">Signal Payload</span>
                    {event.payloadSummary}
                  </div>
                )}

                {/* Threat Intel — RAW API responses */}
                {(event.abuseIpdbResult || event.virusTotalResult || event.greyNoiseResult) && (
                  <div>
                    <h5 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      <Globe className="w-3.5 h-3.5" /> Threat Intelligence (Raw API Responses)
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      {/* AbuseIPDB */}
                      <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">AbuseIPDB</div>
                        {event.abuseIpdbResult ? (
                          <>
                            <div className={`text-lg font-bold font-mono ${
                              event.abuseIpdbResult.score > 70 ? 'text-red-400' :
                              event.abuseIpdbResult.score > 30 ? 'text-amber-400' : 'text-green-400'
                            }`}>{event.abuseIpdbResult.score}<span className="text-sm font-normal text-gray-500">%</span></div>
                            <div className="text-xs text-gray-500">Abuse confidence</div>
                            {event.abuseIpdbResult.categories?.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                Cat: {event.abuseIpdbResult.categories.join(', ')}
                              </div>
                            )}
                          </>
                        ) : <span className="text-xs text-gray-600">N/A</span>}
                      </div>

                      {/* VirusTotal */}
                      <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">VirusTotal</div>
                        {event.virusTotalResult ? (
                          <>
                            <div className={`text-lg font-bold font-mono ${
                              event.virusTotalResult.maliciousCount > 5 ? 'text-red-400' :
                              event.virusTotalResult.maliciousCount > 0 ? 'text-amber-400' : 'text-green-400'
                            }`}>{event.virusTotalResult.maliciousCount}
                            <span className="text-sm font-normal text-gray-500">/{event.virusTotalResult.totalEngines}</span></div>
                            <div className="text-xs text-gray-500">Engines flagged</div>
                            {event.virusTotalResult.tags?.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">{event.virusTotalResult.tags.join(', ')}</div>
                            )}
                          </>
                        ) : <span className="text-xs text-gray-600">N/A</span>}
                      </div>

                      {/* GreyNoise */}
                      <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">GreyNoise</div>
                        {event.greyNoiseResult ? (
                          <>
                            <div className={`text-sm font-bold capitalize ${
                              event.greyNoiseResult.classification === 'malicious' ? 'text-red-400' :
                              event.greyNoiseResult.classification === 'benign' ? 'text-green-400' : 'text-gray-400'
                            }`}>{event.greyNoiseResult.classification}</div>
                            <div className="text-xs text-gray-500">
                              {event.greyNoiseResult.isTargeted ? '⚠ Targeted attack' : 'Background scan'}
                            </div>
                          </>
                        ) : <span className="text-xs text-gray-600">N/A</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Summary + MITRE */}
                {event.summary && (
                  <div className="bg-blue-950/20 rounded-lg p-3 border border-blue-500/10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Brain className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">AI Analysis</span>
                      {event.mitre_technique && (
                        <span className="ml-auto text-xs text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {event.mitre_technique}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{event.summary}</p>
                  </div>
                )}

                {/* Evidence list */}
                {event.evidence && event.evidence.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">
                      Evidence Trail ({event.evidence.length} signals)
                    </div>
                    <div className="space-y-1">
                      {event.evidence.map((ev: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                          <span className="text-blue-500 mt-0.5 flex-shrink-0">▸</span>
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* APT Correlation */}
                {event.aptCorrelation?.aptSuspicion && (
                  <div className="bg-amber-950/20 rounded-lg p-3 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Network className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">APT Campaign Signal</span>
                      <span className="ml-auto text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        Score: {event.aptCorrelation.aptScore}/100
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{event.aptCorrelation.reasoning}</p>
                    {event.aptCorrelation.mitreStage && (
                      <p className="text-xs text-amber-500 mt-1 font-mono">{event.aptCorrelation.mitreStage}</p>
                    )}
                  </div>
                )}

                {/* Plain English Summary */}
                {event.plainEnglishSummary && (
                  <div className="bg-green-950/20 rounded-lg p-3 border border-green-500/10">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-1.5">
                      For Hospital Administration / Plant Manager
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed italic">"{event.plainEnglishSummary}"</p>
                  </div>
                )}

                {/* Action taken */}
                {event.actionTaken && (
                  <div className="flex items-center gap-2 text-xs">
                    <Zap className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-gray-500">Action executed:</span>
                    <span className={`font-semibold ${ACTION_LABELS[event.actionTaken]?.color || 'text-white'}`}>
                      {ACTION_LABELS[event.actionTaken]?.label || event.actionTaken}
                    </span>
                    <span className="text-gray-600">(simulated)</span>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassPanel>
    </motion.div>
  );
}
