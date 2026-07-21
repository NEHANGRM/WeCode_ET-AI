'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Gauge } from 'lucide-react';
import type { PipelineStage } from '@/hooks/useSentinelSocket';

interface ConfidenceGaugeProps {
  score: number | null;
  pipelineStage: PipelineStage;
}

export function ConfidenceGauge({ score, pipelineStage }: ConfidenceGaugeProps) {
  const isProcessing = pipelineStage !== 'idle' && pipelineStage !== 'record';

  const getColor = (s: number) => {
    if (s > 80) return { stroke: '#ef4444', text: 'text-red-400', label: 'CONFIRMED ATTACK', bg: 'bg-red-500/10 border-red-500/30' };
    if (s >= 40) return { stroke: '#f59e0b', text: 'text-amber-400', label: 'SUSPICIOUS', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { stroke: '#22c55e', text: 'text-green-400', label: 'BENIGN', bg: 'bg-green-500/10 border-green-500/30' };
  };

  const displayScore = score ?? 0;
  const colors = getColor(displayScore);

  // SVG arc calculation
  const radius = 52;
  const circumference = Math.PI * radius; // Half circle
  const progress = score !== null ? (displayScore / 100) * circumference : 0;

  const stageLabels: Record<PipelineStage, string> = {
    idle: 'Monitoring',
    correlator: 'Correlating...',
    watcher: 'Watching...',
    investigator: 'Investigating...',
    investigator_done: 'Evidence gathered',
    judge: 'Judging...',
    judge_done: 'Verdict reached',
    responder: 'Responding...',
    record: 'Recording'
  };

  return (
    <GlassPanel title="Confidence Gauge" icon={<Gauge className="w-4 h-4" />}>
      <div className="flex flex-col items-center py-4">

        {/* Semicircle gauge */}
        <div className="relative w-36 h-20 overflow-hidden mb-3">
          <svg className="absolute top-0 left-0 w-full" viewBox="0 0 144 80" style={{ overflow: 'visible' }}>
            {/* Background arc */}
            <path
              d="M 16,72 A 56,56 0 0,1 128,72"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Animated progress arc */}
            <motion.path
              d="M 16,72 A 56,56 0 0,1 128,72"
              fill="none"
              stroke={score !== null ? colors.stroke : 'rgba(255,255,255,0.08)'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ filter: score !== null && score > 40 ? `drop-shadow(0 0 6px ${colors.stroke})` : 'none' }}
            />
          </svg>

          {/* Center score */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
            {isProcessing && score === null ? (
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                  />
                ))}
              </div>
            ) : (
              <motion.span
                key={displayScore}
                className={`text-3xl font-bold font-mono ${score !== null ? colors.text : 'text-gray-600'}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                {score !== null ? displayScore : '--'}
              </motion.span>
            )}
          </div>
        </div>

        {/* Status label */}
        {score !== null && (
          <motion.div
            key={displayScore}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs font-bold tracking-widest px-3 py-1 rounded-full border ${colors.bg} ${colors.text} mb-3`}
          >
            {colors.label}
          </motion.div>
        )}

        {/* Pipeline stage */}
        <div className="text-xs text-gray-500 font-mono text-center">
          {stageLabels[pipelineStage]}
          {isProcessing && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >_</motion.span>
          )}
        </div>

        {/* Threshold markers */}
        <div className="flex justify-between w-full mt-3 px-2">
          <span className="text-xs text-green-500 font-mono">0</span>
          <span className="text-xs text-amber-500 font-mono">40</span>
          <span className="text-xs text-red-500 font-mono">80</span>
          <span className="text-xs text-red-500 font-mono">100</span>
        </div>
      </div>
    </GlassPanel>
  );
}
