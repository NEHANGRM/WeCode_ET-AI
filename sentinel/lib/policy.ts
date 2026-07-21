import policyData from '../policy.json';
import assetsData from '../assets.json';

export interface AssetInfo {
  asset_id: string;
  name: string;
  type: string;
  asset_class: string;
  ip_range: string;
  location?: string;
  critical: boolean;
  dependents: string[];
  description: string;
}

export interface PolicyClass {
  label: string;
  description: string;
  permitted_actions: string[];
  forbidden_actions: string[];
  blast_radius_threshold: number;
}

export function getAssetByIp(ip: string): AssetInfo | null {
  const assets = (assetsData as any).assets as AssetInfo[];
  // Simplified IP matching for demo — in prod would use proper CIDR matching
  return assets.find(a => 
    a.ip_range === ip || 
    (a.ip_range.includes('/') && ip.startsWith(a.ip_range.split('/')[0].substring(0, a.ip_range.lastIndexOf('.'))))
  ) || null;
}

export function getAssetClass(assetClassId: string): PolicyClass | null {
  const classes = (policyData as any).asset_classes;
  return classes[assetClassId] || null;
}

export function isActionPermitted(assetClassId: string, action: string): {
  permitted: boolean;
  reason: string;
} {
  const assetClass = getAssetClass(assetClassId);
  if (!assetClass) {
    // Unknown asset class — be conservative
    return { 
      permitted: action === 'alert_human' || action === 'open_ticket',
      reason: `Unknown asset class "${assetClassId}" — only safe informational actions permitted`
    };
  }

  if (assetClass.forbidden_actions.includes(action)) {
    return {
      permitted: false,
      reason: `Action "${action}" is explicitly forbidden on ${assetClass.label} assets (${assetClass.description})`
    };
  }

  if (assetClass.permitted_actions.includes(action)) {
    return {
      permitted: true,
      reason: `Action "${action}" is permitted on ${assetClass.label} assets`
    };
  }

  // Not in either list — default to safe
  return {
    permitted: false,
    reason: `Action "${action}" is not in the permitted list for ${assetClass.label} — defaulting to safe deny`
  };
}

export function getSafeAlternative(assetClassId: string): string {
  const assetClass = getAssetClass(assetClassId);
  if (!assetClass) return 'alert_human';
  // Pick the most impactful permitted safe action
  const priority = ['block_ip', 'open_ticket', 'alert_human'];
  for (const action of priority) {
    if (assetClass.permitted_actions.includes(action)) return action;
  }
  return 'alert_human';
}

export function getAllAssetClasses() {
  return (policyData as any).asset_classes;
}

export function getAllAssets() {
  return (assetsData as any).assets as AssetInfo[];
}
