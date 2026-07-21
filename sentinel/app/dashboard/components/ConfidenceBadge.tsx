'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfidenceBadgeProps {
  score: number;
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  let level = 'low';
  let icon = <Info className="w-3 h-3" />;
  let colors = 'bg-white/5 text-gray-400 border-white/10';

  if (score > 80) {
    level = 'high';
    icon = <CheckCircle className="w-3 h-3" />;
    colors = 'bg-red-500/10 text-red-400 border-red-500/20'; // High confidence of attack = RED alert
  } else if (score >= 40) {
    level = 'medium';
    icon = <AlertTriangle className="w-3 h-3" />;
    colors = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  } else {
    colors = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'; // Low confidence of attack = GREEN (safe)
  }

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium tracking-tight ${colors}`}
    >
      {icon}
      <span>{score}% CONFIDENCE</span>
    </motion.div>
  );
}
