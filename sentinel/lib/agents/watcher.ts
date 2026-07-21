/**
 * Watcher Agent — Rule-Based, NO AI, NO LLM calls (must be instant & deterministic)
 * 
 * Implements threshold-based anomaly detection per the spec:
 * - 5+ failed logins from one IP within 60 seconds → BRUTE_FORCE_PATTERN
 * - Traffic volume >3x rolling average → RATE_LIMIT_EXCEEDED
 * - Known-bad IP blocklist match → KNOWN_BAD_IP
 * - OT asset config change from IT subnet → OT_PROTOCOL_VIOLATION
 * - Sequential port scan pattern → PORT_SCAN
 */

export interface RawEvent {
  source_ip: string;
  event_type: string;
  target_asset?: {
    id: string;
    name: string;
    type: string;       // "OT" | "IT" | "MEDICAL" | "DMZ"
    asset_class: string;
  };
  timestamp: Date;
  payload_size?: number;
  payload_summary?: string;
  protocol?: string;
  // Legacy fields for backward compatibility
  ip?: string;
  payloadSummary?: string;
}

export interface WatcherFlag {
  flagged: boolean;
  reason: string;
  reasonCode: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  event: RawEvent;
}

// --- Known-bad IP blocklist (would be pulled from threat intel feeds in prod) ---
const KNOWN_BAD_IPS = new Set([
  '185.150.11.23',  // Known DDoS botnet node
  '91.219.236.0',   // APT29 C2 infrastructure
  '45.133.1.50',    // Ransomware staging server
  '185.220.101.0',  // Tor exit node known for attacks
  '194.165.16.0',   // Known credential-stuffing source
]);

// --- In-memory rolling window for threshold checks ---
// In production this would be Redis; for demo, in-process map is fine
const loginFailureWindow: Map<string, { count: number; firstSeen: number }> = new Map();
const trafficWindow: Map<string, number[]> = new Map();

const BRUTE_FORCE_THRESHOLD = 5;     // failed logins
const BRUTE_FORCE_WINDOW_MS = 60000; // 60 seconds
const TRAFFIC_SPIKE_MULTIPLIER = 3;  // 3x rolling average

// --- OT subnet definition (what should NEVER originate MODBUS/DNP3) ---
const IT_SUBNETS = ['192.168.1.', '192.168.0.', '10.0.0.', '10.0.1.'];
const OT_PROTOCOLS = ['MODBUS', 'DNP3', 'IEC-104', 'PROFIBUS', 'S7COMM'];

export function runWatcher(event: RawEvent): WatcherFlag | null {
  const ip = event.source_ip || event.ip || '';
  const summary = (event.payload_summary || event.payloadSummary || '').toLowerCase();
  const protocol = (event.protocol || '').toUpperCase();
  const eventType = (event.event_type || '').toLowerCase();
  const targetType = event.target_asset?.type || '';
  const assetClass = event.target_asset?.asset_class || 'general_network';

  const makeFlag = (reasonCode: string, reason: string, severity: WatcherFlag['severity']): WatcherFlag => ({
    flagged: true,
    reason,
    reasonCode,
    severity,
    event
  });

  // ─── Rule 1: Known-bad IP blocklist (instant, highest priority) ───
  if (KNOWN_BAD_IPS.has(ip)) {
    return makeFlag(
      'KNOWN_BAD_IP',
      `Source IP ${ip} matched internal blocklist — known malicious actor`,
      'critical'
    );
  }

  // ─── Rule 2: Brute force detection (5+ failures in 60s) ───
  if (
    eventType.includes('failed_login') ||
    eventType.includes('auth_failure') ||
    summary.includes('failed login') ||
    summary.includes('ssh attempt') ||
    summary.includes('brute')
  ) {
    const now = Date.now();
    const entry = loginFailureWindow.get(ip);

    if (!entry || now - entry.firstSeen > BRUTE_FORCE_WINDOW_MS) {
      loginFailureWindow.set(ip, { count: 1, firstSeen: now });
    } else {
      entry.count++;
      if (entry.count >= BRUTE_FORCE_THRESHOLD) {
        loginFailureWindow.delete(ip); // Reset counter
        return makeFlag(
          'BRUTE_FORCE_PATTERN',
          `${entry.count} failed login attempts from ${ip} in under 60 seconds — brute force pattern`,
          'high'
        );
      }
    }
    // Not yet over threshold — don't flag yet (Watcher is patient)
    // But if payload strongly suggests ongoing brute force, flag it
    if (summary.includes('brute') || summary.includes('credential stuffing')) {
      return makeFlag('BRUTE_FORCE_PATTERN', `Brute force indicators in payload from ${ip}`, 'high');
    }
  }

  // ─── Rule 3: OT protocol violation — IT subnet sending OT commands ───
  const isOTProtocol = OT_PROTOCOLS.some(p => protocol.includes(p));
  const isFromITSubnet = IT_SUBNETS.some(subnet => ip.startsWith(subnet));
  const isTargetingOTAsset = targetType === 'OT' || targetType === 'ot_control' ||
    summary.includes('plc') || summary.includes('scada') || summary.includes('rtu') ||
    summary.includes('modbus') || summary.includes('coil') || summary.includes('register');

  if (isOTProtocol && isFromITSubnet) {
    return makeFlag(
      'OT_PROTOCOL_VIOLATION',
      `OT protocol (${protocol}) detected from IT subnet IP ${ip} — possible IT/OT boundary crossing or lateral movement`,
      'critical'
    );
  }

  if (isTargetingOTAsset && (eventType.includes('config_change') || summary.includes('config_change') || summary.includes('write coil'))) {
    return makeFlag(
      'OT_PROTOCOL_VIOLATION',
      `Configuration change command sent to OT/ICS asset from ${ip} — unauthorized control-system modification attempt`,
      'critical'
    );
  }

  // ─── Rule 4: Traffic volume spike (>3x rolling average) ───
  const payloadSize = event.payload_size || 0;
  if (payloadSize > 0) {
    const history = trafficWindow.get(ip) || [];
    history.push(payloadSize);
    if (history.length > 10) history.shift(); // Keep last 10 measurements
    trafficWindow.set(ip, history);

    if (history.length >= 3) {
      const avg = history.slice(0, -1).reduce((a, b) => a + b, 0) / (history.length - 1);
      if (avg > 0 && payloadSize > avg * TRAFFIC_SPIKE_MULTIPLIER) {
        return makeFlag(
          'RATE_LIMIT_EXCEEDED',
          `Traffic spike from ${ip}: ${payloadSize} bytes (${(payloadSize / avg).toFixed(1)}x rolling average of ${Math.round(avg)} bytes)`,
          'high'
        );
      }
    }
  }

  if (summary.includes('flood') || summary.includes('syn flood') || summary.includes('burst') || summary.includes('ddos')) {
    return makeFlag(
      'RATE_LIMIT_EXCEEDED',
      `Flood/burst pattern detected in payload from ${ip}`,
      'critical'
    );
  }

  // ─── Rule 5: Port scan detection ───
  if (
    eventType.includes('port_scan') ||
    summary.includes('sequential port') ||
    summary.includes('port scan') ||
    summary.includes('nmap') ||
    summary.includes('service enumeration')
  ) {
    return makeFlag(
      'PORT_SCAN',
      `Sequential port scan detected from ${ip} — reconnaissance activity`,
      'medium'
    );
  }

  // ─── Rule 6: Unusual DNS / exfiltration indicators ───
  if (
    summary.includes('dns tunnel') ||
    summary.includes('base64 in dns') ||
    summary.includes('large txt record') ||
    eventType.includes('dns_anomaly')
  ) {
    return makeFlag(
      'UNUSUAL_DNS',
      `Unusual DNS query pattern from ${ip} — possible DNS tunneling/exfiltration`,
      'high'
    );
  }

  // ─── Not flagged — clean traffic ───
  return null;
}
