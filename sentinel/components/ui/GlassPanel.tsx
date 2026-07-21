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
      whileHover={onClick ? { scale: 1.01, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`glass-panel overflow-hidden transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-[var(--color-accent)]/30' : ''} ${className}`}
      onClick={onClick}
    >
      {(title || icon) && (
        <div className="flex items-center gap-3 px-5 pt-5 pb-2">
          {icon && <span className="text-white w-5 h-5">{icon}</span>}
          {title && <h3 className="text-[14px] font-semibold text-white tracking-[0.1em] uppercase">{title}</h3>}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </motion.div>
  );
}
