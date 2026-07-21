import { getAllAssets } from './policy';

export interface BlastRadiusResult {
  targetAsset: string | null;
  affectedCount: number;
  criticalAssets: string[];
  hasCriticalImpact: boolean;
  details: Array<{
    asset_id: string;
    name: string;
    critical: boolean;
    type: string;
  }>;
  recommendation: string;
}

/**
 * Computes the blast radius for isolating or failing over a given IP.
 * Checks the asset graph to find dependent assets, flags critical ones.
 */
export function computeBlastRadius(ip: string, action: string): BlastRadiusResult {
  const assets = getAllAssets();
  
  // Find the target asset
  const targetAsset = assets.find(a => 
    a.ip_range === ip || ip.startsWith(a.ip_range.split('/')[0].substring(0, a.ip_range.lastIndexOf('.')))
  );

  if (!targetAsset) {
    return {
      targetAsset: null,
      affectedCount: 0,
      criticalAssets: [],
      hasCriticalImpact: false,
      details: [],
      recommendation: `No asset graph entry for IP ${ip}. Proceeding with ${action}.`
    };
  }

  // Find all assets that depend on this one
  const dependentIds = targetAsset.dependents || [];
  const dependentAssets = assets.filter(a => dependentIds.includes(a.asset_id));
  
  // Also find assets that list this asset as a dependent (reverse dependency)
  const reverseDependents = assets.filter(a => 
    a.dependents && a.dependents.includes(targetAsset.asset_id)
  );
  
  const allAffected = [...dependentAssets, ...reverseDependents].filter(
    (a, i, arr) => arr.findIndex(x => x.asset_id === a.asset_id) === i
  );

  const criticalAssets = allAffected.filter(a => a.critical).map(a => a.name);
  const hasCriticalImpact = criticalAssets.length > 0 || targetAsset.critical;

  let recommendation: string;
  if (hasCriticalImpact) {
    recommendation = `⚠️ HIGH RISK: ${action} on "${targetAsset.name}" would affect ${allAffected.length} dependent system(s) including critical assets: ${criticalAssets.join(', ')}. Action overridden to alert_human.`;
  } else if (allAffected.length > 5) {
    recommendation = `⚡ MEDIUM RISK: ${action} on "${targetAsset.name}" affects ${allAffected.length} systems. Consider human review before executing.`;
  } else {
    recommendation = `✅ LOW RISK: ${action} on "${targetAsset.name}" has limited impact (${allAffected.length} dependents, none critical).`;
  }

  return {
    targetAsset: targetAsset.name,
    affectedCount: allAffected.length,
    criticalAssets,
    hasCriticalImpact,
    details: allAffected.map(a => ({
      asset_id: a.asset_id,
      name: a.name,
      critical: a.critical,
      type: a.type
    })),
    recommendation
  };
}
