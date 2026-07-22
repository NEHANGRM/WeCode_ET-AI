'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Crosshair, Clock, Shield, Network, Server, ArrowLeft, Activity, Target } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function CampaignDetails({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Campaign not found');
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center text-gray-400 gap-4">
        <Activity className="w-8 h-8 animate-spin text-orange-500" />
        <p>Analyzing campaign data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 p-8 text-center text-red-400">
        <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold">Failed to load campaign</h2>
        <p className="mt-2 text-gray-400">{error}</p>
        <Link href="/dashboard" className="mt-6 inline-block px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{data.campaign_id}</h1>
              <p className="text-gray-400 mt-1 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Detected {new Date(data.detected_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-bold">
            <Crosshair className="w-4 h-4" />
            {data.confidence}% Confidence
          </div>
          <p className="text-gray-500 text-xs mt-2 uppercase tracking-wider font-semibold">Status: <span className={data.status === 'active' ? 'text-red-400' : 'text-emerald-400'}>{data.status}</span></p>
        </div>
      </div>

      {/* Narrative & Mitre */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">Attack Narrative</h2>
          <p className="text-gray-200 leading-relaxed text-lg">{data.attack_chain_narrative}</p>
          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">AI Reasoning</h3>
            <p className="text-gray-400 text-sm">{data.reasoning}</p>
          </div>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">MITRE ATT&CK Stages</h2>
          <div className="space-y-3">
            {data.mitre_chain.map((tech: string, i: number) => (
              <div key={i} className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                <Target className="w-5 h-5 text-indigo-400" />
                <span className="text-gray-200 font-medium">{tech}</span>
              </div>
            ))}
          </div>
          
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4 mt-8">Source Identity</h2>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Network className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-bold">{data.source_group.replace('ip:', '')}</span>
            </div>
            <p className="text-xs text-red-300/70">Coordinated activity originating from this threat source.</p>
          </div>
        </div>
      </div>

      {/* Involved Cases */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Involved Alerts ({data.cases?.length || 0})
        </h2>
        <div className="space-y-3">
          {data.cases?.map((c: any, idx: number) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={c.id} 
              className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {c.mitre_technique || c.reasonCode}
                  </span>
                  <span className="text-gray-400 text-xs">{new Date(c.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-gray-200 mt-2">{c.aiSummary || 'No AI summary available.'}</p>
              </div>
              
              <div className="flex items-center gap-4 shrink-0 bg-black/20 p-3 rounded-lg border border-white/5">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Target Asset</span>
                  <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                    <Server className="w-4 h-4 text-emerald-400" />
                    {c.target_asset?.name || 'Unknown'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
