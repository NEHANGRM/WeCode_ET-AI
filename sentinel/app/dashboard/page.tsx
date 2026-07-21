'use client';
import React, { useState } from 'react';
import { PipelineGraph } from './components/PipelineGraph';
import { EventCard } from './components/EventCard';
import { ReviewQueue } from './components/ReviewQueue';
import { ConfidenceGauge } from './components/ConfidenceGauge';
import { Activity, Play, Zap, AlertTriangle } from 'lucide-react';
import { useSentinelSocket } from '@/hooks/useSentinelSocket';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { state, isConnected } = useSentinelSocket();
  const [simulating, setSimulating] = useState(false);
  const [simStatus, setSimStatus] = useState('');

  const handleAIIMSReplay = async () => {
    setSimulating(true);
    setSimStatus('Injecting AIIMS Delhi attack sequence...');
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'aiims_replay' })
      });
      setSimStatus('4-phase attack sequence injected — watch the pipeline');
      setTimeout(() => setSimStatus(''), 8000);
    } catch (err) {
      setSimStatus('Error injecting scenario');
      console.error(err);
    } finally {
      setTimeout(() => setSimulating(false), 1000);
    }
  };

  const handleSingleEvent = async () => {
    setSimulating(true);
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: '103.228.112.0',
          protocol: 'SMB',
          payloadSummary: 'Repeated SMB access denied errors from HR workstation attempting to access domain controller C$ share. Possible lateral movement attempt.',
          reasonCode: 'POTENTIAL_LATERAL_MOVEMENT',
          event_type: 'lateral_movement'
        })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setSimulating(false), 1000);
    }
  };

  // Get the event with the highest score for the confidence gauge
  const latestActiveEvent = state.events.find(e => 
    e.status === 'investigating' || e.status === 'judged' || e.status === 'responded'
  );
  const gaugeScore = latestActiveEvent?.score ?? null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Live Operations</h2>
              <div className={`flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border shadow-lg ${isConnected ? 'border-green-500/50 text-green-400 glow-border-active' : 'border-red-500/50 text-red-400 glow-border-red'}`}>
                <Activity className={`w-4 h-4 ${isConnected ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-bold tracking-widest">{isConnected ? 'LIVE' : 'DISCONNECTED'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {simStatus && (
                <span className="text-xs font-bold tracking-wide text-amber-300 bg-amber-500/10 border border-amber-500/40 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  {simStatus}
                </span>
              )}
              <Button
                onClick={handleAIIMSReplay}
                disabled={simulating}
                variant="danger"
                size="sm"
                className="relative overflow-hidden group gap-2 font-bold px-5 py-2 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-white/20 to-red-600/0 -translate-x-full group-hover:animate-[cyber-flow_1.5s_ease-in-out_infinite]" />
                <Play className="w-4 h-4" />
                Replay AIIMS Delhi Attack
              </Button>
              <Button
                onClick={handleSingleEvent}
                disabled={simulating}
                variant="ghost"
                size="sm"
                className="gap-2 text-gray-300 hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 border border-transparent hover:border-white/20"
              >
                <Zap className="w-4 h-4" />
                Ambiguous Event
              </Button>
            </div>
          </div>

          {/* AIIMS Context Banner */}
          <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">Demo Scenario: AIIMS Delhi Ransomware (Nov 2022)</p>
              <p className="text-xs text-gray-400 mt-1">
                Real incident: 100+ servers encrypted, 1.3TB data held ransom, critical patient care disrupted for 15 days.
                Estimated impact: ₹200Cr+. Detection time: ~6 hours. <span className="text-green-400">Sentinel detects the same attack in under 60 seconds.</span>
              </p>
            </div>
          </div>

          {/* Pipeline + Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <PipelineGraph />
            </div>
            <div className="lg:col-span-1">
              <ConfidenceGauge score={gaugeScore} pipelineStage={state.pipelineStage} />
            </div>
          </div>

          {/* Events + Review Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                Event Feed
                {state.events.length > 0 && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    {state.events.length}
                  </span>
                )}
              </h3>
              <div className="space-y-3">
                {state.events.length === 0 ? (
                  <div className="text-gray-500 text-sm py-12 text-center bg-white/5 rounded-xl border border-white/5 border-dashed">
                    <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p>No events yet. Click "Replay AIIMS Delhi Attack" to start.</p>
                  </div>
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
