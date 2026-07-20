'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScrollText, FileBarChart } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Audit Log', href: '/audit-log', icon: ScrollText },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
  ];

  return (
    <aside className="w-full md:w-64 border-r border-[var(--color-border-glass)] bg-[var(--color-panel)] backdrop-blur-md flex-shrink-0">
      <nav className="flex md:flex-col h-full overflow-x-auto md:overflow-visible px-4 py-4 md:py-6 gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname?.startsWith(link.href);
          
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-w-[140px] md:min-w-0 ${
                isActive 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
