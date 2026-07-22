import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db/mongoose';
import { Campaign } from '../../../lib/db/models/Campaign';
import { runCampaignCorrelator } from '../../../lib/agents/campaign_correlator';

export const dynamic = 'force-dynamic';

// GET /api/campaigns — list all detected campaigns
export async function GET() {
  try {
    await connectToDatabase();
    const campaigns = await Campaign.find()
      .sort({ detected_at: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(campaigns);
  } catch (err) {
    console.error('[GET /api/campaigns] DB error:', err);
    return NextResponse.json([]);
  }
}

// POST /api/campaigns/run is handled in /api/campaigns/run/route.ts
// This POST handler allows manually triggering from the list endpoint too
export async function POST() {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('[POST /api/campaigns] DB unavailable:', err);
    return NextResponse.json(
      { error: 'Database unavailable', success: false },
      { status: 503 }
    );
  }

  try {
    const result = await runCampaignCorrelator();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[POST /api/campaigns] Correlator error:', err);
    return NextResponse.json(
      { error: 'Correlator unavailable — please try again', success: false },
      { status: 500 }
    );
  }
}
