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

        {/* Desktop: horizontal connector line */}
        <div className="hidden md:block absolute top-[50%] left-16 right-16 h-px bg-white/10 -translate-y-1/2 z-0" />

        {/* Animated active fill line */}
        <motion.div
          className="hidden md:block absolute top-[50%] left-16 h-px bg-blue-500 -translate-y-1/2 z-0"
          style={{ boxShadow: '0 0 8px rgba(59,130,246,0.6)' }}
          initial={{ width: '0%' }}
          animate={{
            width: activeIndex >= 0
              ? `${(activeIndex / (NODES.length - 1)) * (100 - 16)}%`
              : '0%'
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 relative z-10">
          {NODES.map((node, index) => {
            const Icon = node.icon;
            const isActive = node.id === currentNode;
            const isDone = completedNodes.includes(node.id);
            const isIdle = !isActive && !isDone;

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
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                      : isDone
                      ? 'border-green-500 bg-green-500/15 text-green-400'
                      : 'border-white/15 bg-[#0a0a0f] text-gray-600'
                  }`}
                  animate={isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
                >
                  <Icon className="w-5 h-5" />

                  {/* Pulse ring */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-blue-400"
                      animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  )}
                </motion.div>

                {/* Label */}
                <div className="flex-1 md:flex-none md:text-center">
                  <p className={`text-sm font-semibold ${isActive ? 'text-blue-400' : isDone ? 'text-green-400' : 'text-gray-500'}`}>
                    {node.label}
                  </p>
                  <p className="text-xs text-gray-600 hidden md:block mt-0.5">{node.subLabel}</p>
                  <p className={`text-xs font-mono mt-0.5 md:hidden ${isActive ? 'text-blue-500' : isDone ? 'text-green-500' : 'text-gray-600'}`}>
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
                    className={`text-xs font-mono hidden md:block ${isActive ? 'text-blue-500' : isDone ? 'text-green-500' : 'text-gray-700'}`}
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
              className="mt-4 pt-4 border-t border-white/5 overflow-hidden"
            >
              <p className="text-xs text-gray-500 font-mono">
                <span className="text-blue-400">EVENT</span>{' '}
                {state.pipelineData.eventId?.toString()?.substring(0, 16)}...{' '}
                {state.pipelineData.ip && <span>| <span className="text-white">{state.pipelineData.ip}</span></span>}
                {state.pipelineData.reasonCode && <span>| <span className="text-amber-400">{state.pipelineData.reasonCode}</span></span>}
              </p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </GlassPanel>
  );
}
