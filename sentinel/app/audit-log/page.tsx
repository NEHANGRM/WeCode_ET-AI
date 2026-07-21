'use client';
import React, { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Shield, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; brokenAt?: any } | null>(null);

  useEffect(() => {
    fetch('/api/audit', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setLogs(data))
      .catch(console.error);
  }, []);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/audit?action=verify', { cache: 'no-store' });
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-wide text-[var(--color-text-primary)]">Tamper-Evident Audit Log</h2>
              <p className="text-[var(--color-text-muted)] mt-1">Cryptographic hash chain of all agent decisions.</p>
            </div>
            
            <Button onClick={handleVerify} disabled={verifying} className="gap-2">
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Verify Chain Integrity
            </Button>
          </div>

          <AnimatePresence>
            {verifyResult && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-4 rounded-2xl border flex items-start gap-4 backdrop-blur-sm ${verifyResult.valid ? 'bg-emerald-50/80 border-emerald-200' : 'bg-red-50/80 border-red-200'}`}>
                  {verifyResult.valid ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
                  )}
                  <div>
                    <h3 className={`text-lg font-bold ${verifyResult.valid ? 'text-emerald-700' : 'text-red-700'}`}>
                      {verifyResult.valid ? 'Chain Verified Successfully' : 'INTEGRITY VIOLATION DETECTED'}
                    </h3>
                    <p className="text-[var(--color-text-secondary)] mt-1">
                      {verifyResult.valid 
                        ? 'All cryptographic hashes match. No records have been altered.'
                        : `Hash chain broken at index ${verifyResult.brokenAt?.index} for event ${verifyResult.brokenAt?.eventId}. A record was tampered with.`
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <GlassPanel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/10 text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Timestamp</th>
                    <th className="p-4 font-semibold">Event ID</th>
                    <th className="p-4 font-semibold">Agent</th>
                    <th className="p-4 font-semibold">Action</th>
                    <th className="p-4 font-semibold">Hash Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {logs.map((log) => (
                    <tr key={log._id} className="text-sm hover:bg-white/40 transition-colors">
                      <td className="p-4 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-[var(--color-text-primary)] font-mono text-xs">
                        {typeof log.eventId === 'string' ? log.eventId.substring(0, 8) : (log.eventId?._id || log.eventId?.id || 'unknown').toString().substring(0, 8)}...
                      </td>
                      <td className="p-4 font-medium text-[var(--color-accent)]">
                        {log.payload.agent}
                      </td>
                      <td className="p-4 text-[var(--color-text-primary)]">
                        {log.payload.action.replace('_', ' ')}
                      </td>
                      <td className="p-4 font-mono text-xs text-[var(--color-text-muted)] truncate max-w-[200px]">
                        {log.currentHash}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[var(--color-text-muted)]">
                        No audit records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>

        </div>
      </div>
    </div>
  );
}
