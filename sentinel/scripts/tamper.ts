import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db/mongoose';
import { AuditRecord } from '../lib/db/models/AuditRecord';

async function tamper() {
  await connectToDatabase();
  console.log('Connected to DB.');

  // Find any record in the middle of a chain
  const record = await AuditRecord.findOne({ sequenceNumber: 2 });
  
  if (!record) {
    console.log('No suitable record found to tamper with.');
    process.exit(1);
  }

  console.log('Tampering with record ID:', record._id);
  console.log('Old Payload:', record.payload);
  
  // Maliciously alter the payload
  record.payload.action = 'tampered_action_by_hacker';
  record.markModified('payload');
  await record.save();

  console.log('Record saved with tampered payload without recomputing hash.');
  console.log('The hash chain is now broken!');
  process.exit(0);
}

tamper().catch(console.error);
