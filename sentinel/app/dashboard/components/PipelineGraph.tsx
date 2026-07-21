'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Search, Scale, Shield, Link as LinkIcon } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSentinelSocket } from '@/hooks/useSentinelSocket';

const NODES = [
  { id: 'watcher', label: 'Watcher', subLabel: 'Rule-based detection', icon: Eye },
  { id: 'investigator', label: 'Investigator', subLabel: 'Threat intel + LLM', icon: Search },
  { id: 'judge', label: 'Judge', subLabel: 'Confidence scoring', icon: Scale },
  { id: 'responder', label: 'Responder', subLabel: 'Policy-gated action', icon: Shield },
  { id: 'record', label: 'Record', subLabel: 'Hash-chain audit', icon: LinkIcon },
];

const STAGE_TO_NODE: Record<string, string> = {
  watcher: 'watcher',
  correlator: 'watcher',
  investigator: 'investigator',
  investigator_done: 'investigator',
  judge: 'judge',
  judge_done: 'judge',
  responder: 'responder',
  record: 'record',
};

export function PipelineGraph() {
  const { state } = useSentinelSocket();
  const [currentNode, setCurrentNode] = useState('');
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);

  useEffect(() => {
    const stage = state.pipelineStage;
    const nodeName = STAGE_TO_NODE[stage] || '';

    if (!nodeName) {
      // idle — reset
      setCurrentNode('');
      setCompletedNodes([]);
      return;
    }

    const nodeIndex = NODES.findIndex(n => n.id === nodeName);
    setCurrentNode(nodeName);
    setCompletedNodes(NODES.slice(0, nodeIndex).map(n => n.id));
  }, [state.pipelineStage]);

  const activeIndex = NODES.findIndex(n => n.id === currentNode);

  return (
    <GlassPanel title="Agent Pipeline" className="mb-0">
      <div className="relative py-6 px-2 md:px-6">

        {/* Progress bar background */}
        <div className="hidden md:block absolute bottom-0 left-6 right-6 h-1 bg-white/10 rounded-full z-0" />

        {/* Animated active progress fill */}
        <motion.div
          className="hidden md:block absolute bottom-0 left-6 h-1 bg-[var(--color-accent)] rounded-full z-0"
          style={{ boxShadow: '0 0 8px rgba(138,88,252,0.4)' }}
          initial={{ width: '0%' }}
          animate={{
            width: activeIndex >= 0
              ? `${(activeIndex / (NODES.length - 1)) * 100}%`
              : '0%'
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 relative z-10">
          {NODES.map((node, index) => {
            const Icon = node.icon;
            const isActive = node.id === currentNode;
            const isDone = completedNodes.includes(node.id);

            return (
              <div key={node.id} className="flex md:flex-col items-center gap-3 md:gap-2 w-full md:w-auto relative">

                {/* Mobile vertical connector */}
                {index < NODES.length - 1 && (
                  <div className="md:hidden absolute left-5 top-10 w-px h-8 bg-white/10" />
                )}

                {/* Node circle */}
                <motion.div
                  className={`relative z-10 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-500 flex-shrink-0 ${
                    isActive
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                      : isDone
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/10 bg-white/5 text-[var(--color-text-muted)]'
                  }`}
                  animate={isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
                >
                  <Icon className="w-5 h-5" />

                  {/* Pulse ring */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-[var(--color-accent)]"
                      animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  )}
                </motion.div>

                {/* Label */}
                <div className="flex-1 md:flex-none md:text-center">
                  <p className={`text-sm font-semibold ${isActive ? 'text-[var(--color-accent)]' : isDone ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {node.label}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] hidden md:block mt-0.5">{node.subLabel}</p>
                  <p className={`text-xs font-mono mt-0.5 md:hidden ${isActive ? 'text-[var(--color-accent)]' : isDone ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {isActive ? '● ACTIVE' : isDone ? '✓ DONE' : '○ WAIT'}
                  </p>
                </div>

                {/* Desktop status */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={isActive ? 'active' : isDone ? 'done' : 'wait'}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`text-xs font-mono hidden md:block ${isActive ? 'text-[var(--color-accent)]' : isDone ? 'text-emerald-400' : 'text-gray-400'}`}
                  >
                    {isActive ? '▶ PROCESSING' : isDone ? '✓ COMPLETE' : '○ WAITING'}
                  </motion.p>
                </AnimatePresence>

              </div>
            );
          })}
        </div>

        {/* Active stage info */}
        {state.pipelineData && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-4 border-t border-white/10 overflow-hidden"
            >
              <p className="text-xs text-[var(--color-text-muted)] font-mono">
                <span className="text-[var(--color-accent)]">EVENT</span>{' '}
                {typeof state.pipelineData.eventId === 'string' ? state.pipelineData.eventId.substring(0, 16) : (state.pipelineData.eventId?._id || state.pipelineData.eventId?.id || 'unknown').toString().substring(0, 16)}...{' '}
                {state.pipelineData.ip && <span>| <span className="text-[var(--color-text-primary)]">{state.pipelineData.ip}</span></span>}
                {state.pipelineData.reasonCode && <span>| <span className="text-amber-600">{state.pipelineData.reasonCode}</span></span>}
              </p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </GlassPanel>
  );
}
