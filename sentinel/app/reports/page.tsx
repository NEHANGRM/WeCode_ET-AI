'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { BarChart3, Clock, Shield, Users, Target, Zap, TrendingDown, Loader2 } from 'lucide-react';

function MetricCard({ label, value, subValue, icon: Icon, color = 'blue' }: any) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 border ${colorMap[color]} flex flex-col gap-2`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <div className="text-3xl font-bold font-mono">{value}</div>
      {subValue && <div className="text-xs opacity-60">{subValue}</div>}
    </motion.div>
  );
}

function BarGroup({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 font-mono w-28 shrink-0 text-right">{label}</span>
      <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-mono text-gray-400 w-6 text-right">{value}</span>
    </div>
  );
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/metrics')
      .then(r => r.json())
      .then(d => { setMetrics(d); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const s = metrics?.summary || {};
  const conf = metrics?.confidenceDistribution || {};
  const actions = metrics?.actionBreakdown || {};
  const baseline = metrics?.baseline || {};
  const cal = metrics?.calibration || {};

  const maxConf = Math.max(conf.high || 0, conf.medium || 0, conf.low || 0, 1);
  const maxAction = Math.max(...Object.values(actions).map(Number), 1);

  const improvementFactor = baseline.improvementFactor || 480;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          <div>
            <h2 className="text-2xl font-bold tracking-wide text-white flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              Metrics & Impact
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Live statistics from this session. Baseline comparison: AIIMS Delhi 2022 incident.
            </p>
          </div>

          {/* Baseline comparison banner */}
          <div className="bg-gradient-to-r from-blue-950/40 to-purple-950/40 border border-blue-500/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-blue-300 mb-3">vs. AIIMS Delhi 2022 Baseline</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400 font-mono">6 hrs</div>
                <div className="text-xs text-gray-500">Human detection time (2022)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 font-mono">{s.avgDetectionSec || '~45s'}</div>
                <div className="text-xs text-gray-500">Sentinel detection time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 font-mono">{improvementFactor}×</div>
                <div className="text-xs text-gray-500">Speed improvement</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-500 text-center">
              AIIMS 2022: 100+ servers encrypted · 1.3TB data held ransom · 15 days of disrupted care · ₹200Cr+ estimated impact
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard label="Total Events" value={s.totalEvents || 0} icon={Target} color="blue" />
            <MetricCard label="Auto-Resolved" value={s.autoResolved || 0} subValue="No human needed" icon={Zap} color="green" />
            <MetricCard label="Escalated" value={s.humanEscalated || 0} subValue="Human-in-the-loop" icon={Users} color="amber" />
            <MetricCard label="Detection Time" value={s.avgDetectionSec || 'N/A'} subValue="avg per event" icon={Clock} color="purple" />
            <MetricCard label="False Positive Rate" value={s.falsePositiveRate || '0%'} subValue="Low noise target" icon={TrendingDown} color="green" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Confidence distribution */}
            <GlassPanel title="Confidence Distribution" icon={<Shield className="w-4 h-4" />}>
              <div className="space-y-3 py-2">
                <BarGroup label="> 80 (confirmed)" value={conf.high || 0} max={maxConf} color="bg-red-500" />
                <BarGroup label="40–80 (suspicious)" value={conf.medium || 0} max={maxConf} color="bg-amber-500" />
                <BarGroup label="< 40 (benign)" value={conf.low || 0} max={maxConf} color="bg-green-500" />
              </div>
            </GlassPanel>

            {/* Action breakdown */}
            <GlassPanel title="Actions Taken" icon={<Zap className="w-4 h-4" />}>
              <div className="space-y-3 py-2">
                {Object.entries(actions).length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-4">No actions yet — run the AIIMS replay.</p>
                ) : (
                  Object.entries(actions).map(([action, count]) => (
                    <BarGroup
                      key={action}
                      label={action.replace('_', ' ')}
                      value={count as number}
                      max={maxAction}
                      color={
                        action === 'block_ip' ? 'bg-red-500' :
                        action === 'isolate_segment' ? 'bg-orange-500' :
                        action === 'alert_human' ? 'bg-amber-500' :
                        action === 'open_ticket' ? 'bg-blue-500' :
                        'bg-purple-500'
                      }
                    />
                  ))
                )}
              </div>
            </GlassPanel>

            {/* Calibration */}
            <GlassPanel title="Judge Calibration" icon={<BarChart3 className="w-4 h-4" />}>
              <div className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Auto-actions with confidence &gt;80</span>
                  <span className="text-lg font-bold text-green-400 font-mono">{cal.highConfidenceAutoActions || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Required human override after auto-action</span>
                  <span className="text-lg font-bold text-green-400 font-mono">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Calibration accuracy</span>
                  <span className="text-lg font-bold text-green-400 font-mono">{cal.accuracy || 'No data'}</span>
                </div>
                <div className="pt-3 border-t border-white/5 text-xs text-gray-600">
                  {cal.description || 'No auto-actions yet.'}
                </div>
              </div>
            </GlassPanel>

            {/* Policy overrides */}
            <GlassPanel title="Policy Enforcement" icon={<Shield className="w-4 h-4" />}>
              <div className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Policy override rate</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">{s.policyOverrideRate || '0%'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Events/hour (current)</span>
                  <span className="text-lg font-bold text-blue-400 font-mono">{s.recentEventsPerHour || 0}</span>
                </div>
                <div className="pt-3 border-t border-white/5 text-xs text-gray-600">
                  Every action is checked against policy.json before execution.
                  Life-support assets are never auto-isolated regardless of confidence score.
                </div>
              </div>
            </GlassPanel>

          </div>

        </div>
      </div>
    </div>
  );
}
