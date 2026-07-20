export interface RawSignal {
  ip: string;
  protocol: string;
  payloadSummary: string;
  timestamp: Date;
}

export interface WatcherFlag {
  signal: RawSignal;
  reasonCode: string;
}

export interface ThreatIntelResult {
  abuseIpdbResult: any;
  virusTotalResult: any;
  greyNoiseResult: any;
  aiSummary: string;
  attackCategoryGuess: 'ddos' | 'bruteforce' | 'exfiltration' | 'ransomware_staging' | 'unknown';
}

export interface JudgeDecision {
  confidenceScore: number;
  verdict: 'normal' | 'suspicious' | 'confirmed_attack';
  reasoning: string;
}

export interface ResponderAction {
  actionType: 'block_ip' | 'isolate_segment' | 'alert_oncall' | 'open_ticket' | 'trigger_failover';
}
