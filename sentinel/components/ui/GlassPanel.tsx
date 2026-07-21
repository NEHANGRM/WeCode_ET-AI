'use client';
import React from 'react';
import { motion } from 'framer-motion';

interface GlassPanelProps {
  title?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassPanel({ title, icon, children, className = '', onClick }: GlassPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.01, boxShadow: '0 0 20px rgba(59,130,246,0.15)' } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`bg-[var(--color-panel)] backdrop-blur-xl border border-[var(--color-border-glass)] shadow-[0_4px_30px_rgba(0,0,0,0.1)] rounded-xl overflow-hidden transition-colors duration-300 ${onClick ? 'cursor-pointer hover:border-blue-500/30' : ''} ${className}`}
      onClick={onClick}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border-glass)] bg-white/5">
          {icon && <span className="text-[var(--color-accent)]">{icon}</span>}
          {title && <h3 className="font-semibold text-white tracking-wide text-sm uppercase">{title}</h3>}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </motion.div>
  );
}
