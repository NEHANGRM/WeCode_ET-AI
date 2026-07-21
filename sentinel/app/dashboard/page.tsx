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
          ip: '185.150.11.23',
          protocol: 'TCP/SYN',
          payloadSummary: 'High frequency SYN flood targeting OT Gateway — 47,000 packets/sec',
          reasonCode: 'RATE_LIMIT_EXCEEDED',
          event_type: 'ddos'
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
              <h2 className="text-2xl font-bold tracking-wide text-white">Live Operations</h2>
              <div className={`flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border ${isConnected ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                <Activity className={`w-4 h-4 ${isConnected ? 'animate-pulse' : ''}`} />
                <span className="text-xs">{isConnected ? 'LIVE' : 'DISCONNECTED'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {simStatus && (
                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                  {simStatus}
                </span>
              )}
              <Button
                onClick={handleAIIMSReplay}
                disabled={simulating}
                variant="danger"
                size="sm"
                className="gap-2 font-semibold"
              >
                <Play className="w-4 h-4" />
                Replay AIIMS Delhi Attack
              </Button>
              <Button
                onClick={handleSingleEvent}
                disabled={simulating}
                variant="ghost"
                size="sm"
                className="gap-2 text-gray-400"
              >
                <Zap className="w-4 h-4" />
                Single Event
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
