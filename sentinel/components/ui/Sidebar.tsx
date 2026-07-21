'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScrollText, BarChart3, Folders, ShieldCheck } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, desc: 'Live pipeline' },
    { name: 'Cases', href: '/cases', icon: Folders, desc: 'Evidence review' },
    { name: 'Audit Log', href: '/audit-log', icon: ScrollText, desc: 'Hash chain' },
    { name: 'Policy', href: '/policy', icon: ShieldCheck, desc: 'Action rules' },
    { name: 'Metrics', href: '/reports', icon: BarChart3, desc: 'Impact stats' },
  ];

  return (
    <aside className="w-full md:w-64 border-r border-[var(--color-border-glass)] bg-[var(--color-panel)] backdrop-blur-md flex-shrink-0">
      <nav className="flex md:flex-col h-full overflow-x-auto md:overflow-visible px-3 py-3 md:py-6 gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname?.startsWith(link.href);

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 min-w-[130px] md:min-w-0 group ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm">{link.name}</span>
                <span className={`text-xs hidden md:block transition-colors ${isActive ? 'text-blue-500/60' : 'text-gray-600 group-hover:text-gray-500'}`}>
                  {link.desc}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
