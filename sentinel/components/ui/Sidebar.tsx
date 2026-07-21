'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Folders, ScrollText, Shield, BarChart2, Search } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cases', href: '/cases', icon: Folders },
  { name: 'Audit', href: '/audit-log', icon: ScrollText },
  { name: 'Policy', href: '/policy', icon: Shield },
  { name: 'Metrics', href: '/reports', icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col h-full w-[240px] flex-shrink-0 relative z-20 pointer-events-auto">
      {/* Dark Slate Pill Container */}
      <nav className="flex flex-col h-full px-3 py-4 rounded-[24px]"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header / Logo */}
        <div className="flex items-center gap-3 px-3 pt-2 pb-6">
          <Shield className="w-6 h-6 text-white" />
          <span className="text-[15px] font-bold tracking-[0.15em] uppercase text-white">Warden</span>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-1.5 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);

            return (
              <Link key={item.name} href={item.href}>
                <div className="relative flex items-center px-4 py-3 rounded-2xl transition-all duration-300 cursor-pointer group">
                  {/* Animated active pill background */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: '#8A58FC',
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}

                  <div className="relative z-10 flex items-center gap-3.5">
                    <Icon className={`w-[20px] h-[20px] transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-[#A0A6B8] group-hover:text-white'
                    }`} />
                    <span className={`text-[14px] font-semibold transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-[#A0A6B8] group-hover:text-white'
                    }`}>
                      {item.name}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-4 mt-auto pb-2 px-1">
          {/* Separator line */}
          <div className="w-full h-[1px] bg-white/10" />

          {/* Status Container */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="font-semibold text-white tracking-wide">
              Warden
            </div>

            {/* Status indicator — green circle */}
            <div className="flex items-center justify-center w-[40px] h-[40px]">
              <div className="w-3.5 h-3.5 rounded-full bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.5)] border-2 border-transparent" />
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
