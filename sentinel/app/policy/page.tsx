'use client';
import React, { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ShieldCheck, Loader2, Network, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PolicyPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/policy', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const policy = data?.policy?.asset_classes || {};
  const assets = data?.assets?.assets || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold tracking-wide text-white flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
              Action Policy & Asset Map
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Every automated action is constrained by this policy file before execution. 
              Displayed live — this is the actual file Sentinel reads at runtime.
            </p>
          </div>

          {/* Safety guarantee banner */}
          <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-300">How Policy Enforcement Works</p>
              <p className="text-xs text-gray-400">
                When the Judge recommends an action, the Responder checks it against this file before executing.
                If the action is forbidden on the target asset class, it is <strong className="text-white">automatically overridden</strong> with
                the safest permitted alternative — even if confidence is 100%. This is enforced in code, not just in a prompt.
              </p>
            </div>
          </div>

          {/* Policy table */}
          <GlassPanel title="Action Policy File (policy.json)" icon={<ShieldCheck className="w-4 h-4" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Asset Class</th>
                    <th className="p-4 font-semibold">Description</th>
                    <th className="p-4 font-semibold text-green-400">Permitted Actions</th>
                    <th className="p-4 font-semibold text-red-400">Forbidden Actions</th>
                    <th className="p-4 font-semibold">Blast Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {Object.entries(policy).map(([classId, cls]: any, i) => (
                    <motion.tr
                      key={classId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-white">{cls.label}</div>
                        <div className="text-xs text-blue-400 font-mono mt-0.5">{classId}</div>
                      </td>
                      <td className="p-4 text-xs text-gray-400 max-w-[200px]">{cls.description}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {cls.permitted_actions.map((a: string) => (
                            <span key={a} className="flex items-center gap-1 text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-mono">
                              <CheckCircle className="w-3 h-3" /> {a}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {cls.forbidden_actions.length > 0 ? cls.forbidden_actions.map((a: string) => (
                            <span key={a} className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-mono">
                              <XCircle className="w-3 h-3" /> {a}
                            </span>
                          )) : (
                            <span className="text-xs text-gray-600">None</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-sm font-mono font-bold ${cls.blast_radius_threshold <= 1 ? 'text-red-400' : cls.blast_radius_threshold <= 3 ? 'text-amber-400' : 'text-green-400'}`}>
                          {cls.blast_radius_threshold}
                        </span>
                        <span className="text-xs text-gray-600 ml-1">assets</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>

          {/* Asset dependency map */}
          <GlassPanel title="Asset Dependency Graph (assets.json)" icon={<Network className="w-4 h-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2">
              {assets.map((asset: any, i: number) => (
                <motion.div
                  key={asset.asset_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-lg p-3 border ${
                    asset.critical
                      ? 'bg-red-950/20 border-red-500/20'
                      : 'bg-white/3 border-white/8'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <div className="font-semibold text-sm text-white">{asset.name}</div>
                      <div className="text-xs font-mono text-gray-500">{asset.asset_id}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {asset.critical && (
                        <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> CRITICAL
                        </span>
                      )}
                      <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
                        {asset.asset_class}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{asset.description}</div>
                  <div className="text-xs text-gray-600 font-mono">
                    <span className="text-gray-700">IP:</span> {asset.ip_range}
                    {' · '}
                    <span className="text-gray-700">Location:</span> {asset.location}
                  </div>
                  {asset.dependents?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <span className="text-xs text-amber-500">Blast radius includes: </span>
                      <span className="text-xs text-gray-500">{asset.dependents.join(', ')}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </GlassPanel>

        </div>
      </div>
    </div>
  );
}
