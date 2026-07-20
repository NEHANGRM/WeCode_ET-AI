'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Badge } from '@/components/ui/Badge';
import { ChevronDown, ChevronUp, ShieldAlert, Activity, Server, Database, Globe } from 'lucide-react';

interface EventCardProps {
  event: any;
}

export function EventCard({ event }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassPanel className="mb-4">
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start md:items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-red-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-gray-400">{event.id}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-sm text-gray-300">{event.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-white">{event.ip}</h4>
              <Badge variant="warning">{event.category}</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-3 md:pt-0 mt-2 md:mt-0">
          <div className="flex flex-col md:items-end gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Status</span>
            <span className="text-sm text-blue-400 font-medium capitalize">{event.status.replace('_', ' ')}</span>
          </div>
          
          <div className="flex flex-col md:items-end gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Confidence</span>
            {event.score !== null ? (
              <ConfidenceBadge score={event.score} />
            ) : (
              <span className="text-sm text-gray-400">Evaluating...</span>
            )}
          </div>
          
          <button className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-[var(--color-border-glass)] grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Telemetry Data */}
              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <h5 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  <Activity className="w-3.5 h-3.5" /> Signal Telemetry
                </h5>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between"><span className="text-gray-500">Protocol:</span> <span className="text-gray-300">MODBUS/TCP</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Port:</span> <span className="text-gray-300">502</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Bytes:</span> <span className="text-gray-300">4.2 KB</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Target:</span> <span className="text-gray-300">PLC-BETA-02</span></div>
                </div>
              </div>

              {/* Threat Intel */}
              <div className="bg-black/20 rounded-lg p-3 border border-white/5 lg:col-span-2">
                <h5 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  <Globe className="w-3.5 h-3.5" /> Threat Intel (Investigator)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div className="bg-white/5 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1">AbuseIPDB</div>
                    <div className="text-sm text-red-400 font-semibold">100% Abuse Score</div>
                  </div>
                  <div className="bg-white/5 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1">VirusTotal</div>
                    <div className="text-sm text-amber-400 font-semibold">4/94 Engines Flagged</div>
                  </div>
                  <div className="bg-white/5 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1">GreyNoise</div>
                    <div className="text-sm text-blue-400 font-semibold">Known Malicious</div>
                  </div>
                </div>
                {event.summary && (
                  <div className="text-sm text-gray-300 leading-relaxed bg-white/5 p-3 rounded">
                    <span className="text-gray-500 block mb-1 text-xs uppercase">AI Synthesis</span>
                    {event.summary}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
}
