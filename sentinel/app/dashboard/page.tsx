'use client';
import React from 'react';
import { PipelineGraph } from './components/PipelineGraph';
import { EventCard } from './components/EventCard';
import { ReviewQueue } from './components/ReviewQueue';
import { Activity } from 'lucide-react';
import { useSentinelSocket } from '@/hooks/useSentinelSocket';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { state, isConnected } = useSentinelSocket();

  const handleSimulateAttack = async () => {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: '185.150.11.23',
          protocol: 'TCP/SYN',
          payloadSummary: 'High frequency SYN flood targeting OT Gateway'
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold tracking-wide text-white">Live Operations</h2>
              <div className={`flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 ${isConnected ? 'border-green-500/30' : 'border-red-500/30'}`}>
                <Activity className={`w-4 h-4 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
                <span>{isConnected ? 'Live Socket Connected' : 'Disconnected'}</span>
              </div>
            </div>
            
            <Button onClick={handleSimulateAttack} variant="danger" size="sm">
              Trigger Simulation
            </Button>
          </div>

          <PipelineGraph />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                Recent Events
              </h3>
              <div className="space-y-4">
                {state.events.length === 0 ? (
                  <div className="text-gray-500 text-sm py-8 text-center bg-white/5 rounded-xl border border-white/5">No recent events.</div>
                ) : (
                  state.events.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))
                )}
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <ReviewQueue reviews={state.reviews} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
