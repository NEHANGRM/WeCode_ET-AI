import { isActionPermitted, getAssetByIp, getSafeAlternative, getAssetClass } from '../policy';
import { computeBlastRadius } from '../blastRadius';

/**
 * Responder Agent — NO LLM. Hardcoded lookup table only.
 * 
 * The LLM recommends an action (via Judge). The Responder enforces a policy
 * check and blast-radius check, then executes from a fixed menu.
 * The AI NEVER executes actions directly — this is a safety guarantee.
 */

const HIGH_IMPACT_ACTIONS = ['isolate_segment', 'failover'];

export interface ResponderResult {
  actionTaken: string;
  originalRecommendation: string;
  policyCheck: {
    passed: boolean;
    reason: string;
    assetClass: string;
  };
  blastRadiusCheck: {
    performed: boolean;
    result?: ReturnType<typeof computeBlastRadius>;
    overrideTriggered: boolean;
  };
  executionLog: string[];
}

export async function runResponder(
  judgment: any,
  investigation: any,
  targetIp?: string
): Promise<ResponderResult> {
  const recommendedAction = (judgment.recommended_action || judgment.actionType || 'alert_human') as string;
  const ip = targetIp || judgment.ip || investigation?.abuseIpdbResult?.ip || 'unknown';
  const executionLog: string[] = [];

  executionLog.push(`[Responder] Judge recommended: "${recommendedAction}" with confidence ${judgment.confidence || judgment.confidenceScore}/100`);

  // ─── Step 1: Policy Check ───
  const asset = getAssetByIp(ip);
  const assetClass = asset?.asset_class || 'general_network';
  const policyResult = isActionPermitted(assetClass, recommendedAction);

  executionLog.push(`[Policy] Asset class: "${assetClass}" | Action "${recommendedAction}": ${policyResult.permitted ? 'PERMITTED' : 'DENIED'} — ${policyResult.reason}`);

  let finalAction = recommendedAction;
  let policyOverride = false;

  if (!policyResult.permitted) {
    finalAction = getSafeAlternative(assetClass);
    policyOverride = true;
    executionLog.push(`[Policy] OVERRIDE: Action "${recommendedAction}" forbidden on ${assetClass} assets. Substituting with "${finalAction}".`);
  }

  // ─── Step 2: Blast-Radius Check (for high-impact actions) ───
  let blastRadiusCheck: ResponderResult['blastRadiusCheck'] = { performed: false, overrideTriggered: false };

  if (HIGH_IMPACT_ACTIONS.includes(finalAction)) {
    const blastResult = computeBlastRadius(ip, finalAction);
    executionLog.push(`[BlastRadius] Checking impact of "${finalAction}" on ${ip}...`);
    executionLog.push(`[BlastRadius] ${blastResult.recommendation}`);

    blastRadiusCheck = { performed: true, result: blastResult, overrideTriggered: false };

    if (blastResult.hasCriticalImpact) {
      finalAction = 'alert_human';
      blastRadiusCheck.overrideTriggered = true;
      executionLog.push(`[BlastRadius] OVERRIDE: Critical assets affected (${blastResult.criticalAssets.join(', ')}). Forcing "alert_human" instead.`);
    }
  }

  // ─── Step 3: Execute from fixed action table ───
  executionLog.push(`[Responder] Executing action: "${finalAction}"`);
  executeAction(finalAction, ip, judgment, executionLog);

  const assetClassObj = getAssetClass(assetClass);

  return {
    actionTaken: finalAction,
    originalRecommendation: recommendedAction,
    policyCheck: {
      passed: policyResult.permitted && !policyOverride,
      reason: policyResult.reason,
      assetClass
    },
    blastRadiusCheck,
    executionLog
  };
}

/**
 * Fixed action execution table — THIS is where actions are executed.
 * Code-enforced, never freeform LLM output.
 */
function executeAction(
  action: string,
  ip: string,
  judgment: any,
  log: string[]
): void {
  switch (action) {
    case 'block_ip':
      log.push(`[EXECUTED] block_ip: Added ${ip} to blocklist. All traffic from this source is now denied at the perimeter firewall.`);
      log.push(`[SIMULATED] iptables -A INPUT -s ${ip} -j DROP`);
      break;

    case 'isolate_segment':
      log.push(`[EXECUTED] isolate_segment: Network segment containing ${ip} has been isolated. All inter-VLAN routing to this segment disabled.`);
      log.push(`[SIMULATED] SDN controller: isolate_vlan(source_ip=${ip}, duration=quarantine)`);
      break;

    case 'alert_human':
      log.push(`[EXECUTED] alert_human: On-call security team paged via PagerDuty. Incident ticket auto-created. Confidence: ${judgment.confidence || judgment.confidenceScore}/100.`);
      log.push(`[SIMULATED] POST /api/pagerduty/alert { severity: "critical", ip: "${ip}" }`);
      break;

    case 'open_ticket':
      log.push(`[EXECUTED] open_ticket: Incident ticket created in ITSM system for follow-up investigation. Assigned to Tier-1 SOC team.`);
      log.push(`[SIMULATED] POST /jira/issues { type: "security_incident", priority: "medium", source_ip: "${ip}" }`);
      break;

    case 'failover':
      log.push(`[EXECUTED] failover: System failover initiated. Secondary node activated. Load balancer updated to redirect traffic.`);
      log.push(`[SIMULATED] keepalived --failover --node secondary --reason "sentinel_auto_response"`);
      break;

    case 'none':
      log.push(`[EXECUTED] none: No action taken. Event logged for statistical analysis. Confidence below threshold.`);
      break;

    default:
      log.push(`[SAFETY] Unknown action "${action}" rejected. Defaulting to alert_human.`);
      log.push(`[EXECUTED] alert_human: Safety fallback — unknown action requested by upstream agent.`);
  }
}
