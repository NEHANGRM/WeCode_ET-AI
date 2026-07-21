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

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-center pt-5 pb-2 sticky top-0 z-50 pointer-events-none">
      {/* Floating pill navbar — pointer events auto so we can click inside it */}
      <div className="pointer-events-auto">
        <nav className="flex items-center gap-1.5 px-2 py-1.5 rounded-[20px]"
          style={{
            background: 'rgba(85, 95, 115, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);

            return (
              <Link key={item.name} href={item.href}>
                <div className="relative flex items-center justify-center px-4 py-2.5 rounded-2xl transition-all duration-300 cursor-pointer h-[42px]">
                  {/* Animated active pill background */}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-active-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: '#8A58FC',
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}

                  <div className="relative z-10 flex items-center gap-2.5">
                    <Icon className={`w-[18px] h-[18px] transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-[#A0A6B8] hover:text-white'
                    }`} />

                    {/* Label — only show for active item */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="text-[13px] font-bold text-white tracking-wide overflow-hidden whitespace-nowrap"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Separator */}
          <div className="w-[1px] h-6 bg-white/10 mx-2" />

          {/* Search icon */}
          <button className="flex items-center justify-center w-[42px] h-[42px] rounded-xl text-[#A0A6B8] hover:text-white transition-colors duration-200">
            <Search className="w-[18px] h-[18px]" />
          </button>

          {/* Status indicator — green circle */}
          <div className="flex items-center justify-center w-[42px] h-[42px] pr-1">
            <div className="w-3.5 h-3.5 rounded-full bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.5)] border-2 border-transparent" />
          </div>
        </nav>
      </div>
    </header>
  );
}
