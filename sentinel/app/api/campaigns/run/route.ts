import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db/mongoose';
import { runCampaignCorrelator } from '../../../../lib/agents/campaign_correlator';

export const dynamic = 'force-dynamic';

// POST /api/campaigns/run — manually trigger one correlation pass
// Must work reliably even with zero events: returns empty result, not an error
export async function POST() {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('[POST /api/campaigns/run] DB unavailable:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Database unavailable — start MongoDB to use the correlator',
        campaigns_detected: 0,
        campaigns: [],
        groups_analyzed: 0
      },
      { status: 503 }
    );
  }

  try {
    console.log('[Correlator] Manual run triggered');
    const result = await runCampaignCorrelator();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[POST /api/campaigns/run] Correlator error:', err);
    // Never crash the caller — always return a valid response
    return NextResponse.json({
      success: false,
      error: 'Correlator encountered an error — please try again',
      campaigns_detected: 0,
      campaigns: [],
      groups_analyzed: 0,
      message: err?.message || 'Unknown error'
    });
  }
}
