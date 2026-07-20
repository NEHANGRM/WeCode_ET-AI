import React from 'react';
import { Shield, Menu } from 'lucide-react';
import { StatusDot } from './StatusDot';

export function Navbar() {
  return (
    <header className="h-16 border-b border-[var(--color-border-glass)] bg-[var(--color-panel)] backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <Shield className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wider text-white">SENTINEL</h1>
          <p className="text-xs text-gray-400 font-mono tracking-widest uppercase">Autonomous Defense</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <StatusDot status="online" />
          <span className="text-xs font-medium text-gray-300">SYSTEM ONLINE</span>
        </div>
        <button className="md:hidden text-gray-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
