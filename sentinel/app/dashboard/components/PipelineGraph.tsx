'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Search, Scale, Shield, Link as LinkIcon } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSentinelSocket } from '@/hooks/useSentinelSocket';

export function PipelineGraph() {
  const { state } = useSentinelSocket();
  const [activeStage, setActiveStage] = useState('watcher');

  useEffect(() => {
    if (state.events.length > 0) {
      const latest = state.events[0].status;
      if (latest === 'flagged') setActiveStage('watcher');
      else if (latest === 'investigating') setActiveStage('investigator');
      else if (latest === 'judged') setActiveStage('judge');
      else if (latest === 'responded') setActiveStage('responder');
      else if (latest === 'closed' || latest === 'recorded') setActiveStage('record');
    }
  }, [state.events]);

  const nodes = [
    { id: 'watcher', label: 'Watcher', icon: Eye },
    { id: 'investigator', label: 'Investigator', icon: Search },
    { id: 'judge', label: 'Judge', icon: Scale },
    { id: 'responder', label: 'Responder', icon: Shield },
    { id: 'record', label: 'Record', icon: LinkIcon },
  ];

  const activeIndex = nodes.findIndex(n => n.id === activeStage);

  return (
    <GlassPanel title="Pipeline Status" className="mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between py-6 px-4 md:px-12 relative">
        
        {/* Connecting line background (desktop only) */}
        <div className="hidden md:block absolute top-1/2 left-16 right-16 h-1 bg-white/10 -translate-y-1/2 z-0 rounded-full" />
        
        {/* Connecting line active (desktop only) */}
        <motion.div 
          className="hidden md:block absolute top-1/2 left-16 h-1 bg-blue-500/50 -translate-y-1/2 z-0 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${(activeIndex / (nodes.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {nodes.map((node, index) => {
          const Icon = node.icon;
          const isActive = index === activeIndex;
          const isCompleted = index < activeIndex;
          
          let ringColor = 'border-white/10 text-gray-500 bg-[#0a0a0f]';
          if (isActive) ringColor = 'border-blue-500 text-blue-400 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]';
          if (isCompleted) ringColor = 'border-green-500 text-green-400 bg-green-500/10';

          return (
            <div key={node.id} className="relative z-10 flex md:flex-col items-center gap-4 md:gap-3 my-3 md:my-0 w-full md:w-auto">
              
              <div className="md:hidden flex-grow flex items-center h-full absolute left-[19px] top-10 bottom-0 z-0">
                 {index < nodes.length - 1 && (
                   <div className={`w-0.5 h-12 ${isCompleted ? 'bg-green-500/50' : 'bg-white/10'}`} />
                 )}
              </div>

              <motion.div 
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center bg-[#0a0a0f] relative z-10 transition-colors duration-300 ${ringColor}`}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <motion.div 
                    className="absolute inset-0 rounded-full border-2 border-blue-500 opacity-50"
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </motion.div>
              
              <div className="flex-1 md:flex-none">
                <h4 className={`text-sm font-semibold tracking-wide ${isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-500'}`}>
                  {node.label}
                </h4>
                <p className="text-xs text-gray-500 font-mono hidden md:block mt-1">
                  {isActive ? 'PROCESSING' : isCompleted ? 'DONE' : 'WAITING'}
                </p>
              </div>
              
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
