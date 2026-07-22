import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db/mongoose';
import { Campaign } from '../../../../lib/db/models/Campaign';
import { Event } from '../../../../lib/db/models/Event';
import { Investigation } from '../../../../lib/db/models/Investigation';
import { Judgment } from '../../../../lib/db/models/Judgment';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET /api/campaigns/:id — campaign detail with populated case data
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('[GET /api/campaigns/:id] DB error:', err);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const campaign = await Campaign.findOne({ campaign_id: params.id }).lean() as any;
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Populate involved cases with their evidence
  const caseDetails = [];
  for (const caseIdStr of (campaign.involved_case_ids || [])) {
    try {
      // Handle both string and ObjectId
      const eventId = typeof caseIdStr === 'string'
        ? (mongoose.Types.ObjectId.isValid(caseIdStr) ? new mongoose.Types.ObjectId(caseIdStr) : null)
        : caseIdStr;

      if (!eventId) continue;

      const [event, inv, judg] = await Promise.all([
        Event.findById(eventId).lean(),
        Investigation.findOne({ eventId }).sort({ createdAt: -1 }).lean(),
        Judgment.findOne({ eventId }).sort({ createdAt: -1 }).lean()
      ]);

      if (event) {
        caseDetails.push({
          id: (event as any)._id.toString(),
          ip: (event as any).rawSignal?.ip,
          reasonCode: (event as any).rawSignal?.reasonCode,
          status: (event as any).status,
          createdAt: (event as any).createdAt,
          target_asset: (event as any).rawSignal?.target_asset,
          mitre_technique: (inv as any)?.mitre_technique || '',
          verdict: (judg as any)?.verdict || 'unknown',
          confidence: (judg as any)?.confidence || 0,
          aiSummary: (inv as any)?.aiSummary || ''
        });
      }
    } catch (e) {
      // Skip bad IDs silently
    }
  }

  // Sort cases chronologically
  caseDetails.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return NextResponse.json({
    ...campaign,
    _id: campaign._id?.toString(),
    cases: caseDetails
  });
}

// PATCH /api/campaigns/:id — update status
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const campaign = await Campaign.findOneAndUpdate(
      { campaign_id: params.id },
      { status: body.status, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(campaign);
  } catch (err) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
