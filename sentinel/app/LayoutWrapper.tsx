'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from "@/components/ui/Sidebar";
import { ChatCopilot } from "@/app/dashboard/components/ChatCopilot";
import { motion } from 'framer-motion';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // If we are on the landing page, don't render the sidebar or the dashboard wrapper container
  if (pathname === '/') {
    return <div className="h-full overflow-y-auto w-full bg-[#05050A]">{children}</div>;
  }

  // Otherwise, render the standard dashboard layout
  return (
    <>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-1 overflow-hidden z-0 p-5 gap-5 h-full"
      >
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative rounded-3xl bg-white/10 shadow-xl border border-white/20 backdrop-blur-md">
          {children}
        </main>
      </motion.div>
      
      {/* Chat Copilot — global floating overlay for dashboard pages */}
      <ChatCopilot />
    </>
  );
}
