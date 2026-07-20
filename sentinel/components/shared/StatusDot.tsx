'use client';
import React from 'react';
import { motion } from 'framer-motion';

interface StatusDotProps {
  status: 'online' | 'warning' | 'offline';
}

export function StatusDot({ status }: StatusDotProps) {
  const colors = {
    online: 'bg-[var(--color-accent-green)]',
    warning: 'bg-[var(--color-accent-amber)]',
    offline: 'bg-[var(--color-accent-red)]'
  };

  return (
    <div className="relative flex items-center justify-center w-3 h-3">
      <motion.div
        className={`absolute inset-0 rounded-full ${colors[status]} opacity-50`}
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className={`relative w-2 h-2 rounded-full ${colors[status]}`} />
    </div>
  );
}
