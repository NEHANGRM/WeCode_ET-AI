import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db/mongoose';
import { AuditRecord } from '../../../lib/db/models/AuditRecord';
import { verifyChain } from '../../../lib/hashChain';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  await connectToDatabase();

  if (action === 'verify') {
    const allRecords = await AuditRecord.find().sort({ eventId: 1, sequenceNumber: 1 });
    
    // Group by eventId to verify each chain separately
    const chains: Record<string, any[]> = {};
    for (const rec of allRecords) {
      const eid = rec.eventId.toString();
      if (!chains[eid]) chains[eid] = [];
      chains[eid].push(rec);
    }

    let overallValid = true;
    let brokenAt: any = null;

    for (const [eventId, records] of Object.entries(chains)) {
      const result = verifyChain(records);
      if (!result.valid) {
        overallValid = false;
        brokenAt = { eventId, index: result.brokenAtIndex };
        break;
      }
    }

    return NextResponse.json({
      valid: overallValid,
      brokenAt,
      totalRecordsChecked: allRecords.length
    });
  }

  // Default: return audit log
  const records = await AuditRecord.find().sort({ createdAt: -1 }).limit(50).populate('eventId');
  return NextResponse.json(records);
}
