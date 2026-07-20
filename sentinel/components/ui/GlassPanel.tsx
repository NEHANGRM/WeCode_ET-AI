'use client';
import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassPanelProps extends HTMLMotionProps<'div'> {
  title?: string;
  icon?: React.ReactNode;
}

export function GlassPanel({ title, icon, children, className = '', ...props }: GlassPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[var(--color-panel)] backdrop-blur-md border border-[var(--color-border-glass)] rounded-xl overflow-hidden ${className}`}
      {...props}
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
