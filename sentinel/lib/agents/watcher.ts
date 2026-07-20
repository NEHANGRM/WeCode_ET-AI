import { RawSignal, WatcherFlag } from '../../types';

/**
 * Rule-based scanner (No AI)
 * Simulates checking a live network stream against known signatures and thresholds.
 */
export async function runWatcher(signal: RawSignal): Promise<WatcherFlag | null> {
  // Simple heuristic checks
  
  if (signal.payloadSummary.toLowerCase().includes('flood') || signal.payloadSummary.toLowerCase().includes('burst')) {
    return { signal, reasonCode: 'RATE_LIMIT_EXCEEDED' };
  }

  if (signal.payloadSummary.toLowerCase().includes('failed login') || signal.payloadSummary.toLowerCase().includes('ssh attempts')) {
    return { signal, reasonCode: 'BRUTE_FORCE_PATTERN' };
  }

  if (signal.protocol.includes('MODBUS') || signal.protocol.includes('DNP3')) {
    // OT protocols seen in strange context (e.g., from IT subnet)
    if (signal.payloadSummary.toLowerCase().includes('unusual') || signal.payloadSummary.toLowerCase().includes('it subnet')) {
      return { signal, reasonCode: 'OT_PROTOCOL_VIOLATION' };
    }
  }

  if (signal.payloadSummary.toLowerCase().includes('scan')) {
    return { signal, reasonCode: 'PORT_SCAN' };
  }

  // If none of the rules match, it's not flagged.
  // For the sake of the pipeline demo, we'll assume any input event is something that got flagged.
  return { signal, reasonCode: 'ANOMALY_DETECTED' };
}
