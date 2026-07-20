import crypto from 'crypto';
import { AuditRecord } from './db/models/AuditRecord';
import mongoose from 'mongoose';

/**
 * Creates a SHA-256 hash from payload and previous hash
 */
export function createHash(payload: any, previousHash: string): string {
  const dataString = JSON.stringify(payload) + previousHash;
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Appends a new record to the hash chain for a specific event
 */
export async function appendToChain(
  eventId: mongoose.Types.ObjectId | string,
  agent: string,
  action: string,
  evidence?: any
) {
  // Find the last record in the chain for this event
  const lastRecord = await AuditRecord.findOne({ eventId }).sort({ sequenceNumber: -1 });

  const sequenceNumber = lastRecord ? lastRecord.sequenceNumber + 1 : 1;
  const previousHash = lastRecord ? lastRecord.currentHash : '0'.repeat(64); // Genesis hash

  const payload = { agent, action, evidence };
  const currentHash = createHash(payload, previousHash);

  const record = new AuditRecord({
    eventId,
    sequenceNumber,
    payload,
    previousHash,
    currentHash
  });

  await record.save();
  return record;
}

/**
 * Verifies the integrity of a hash chain
 */
export function verifyChain(records: any[]): { valid: boolean; brokenAtIndex: number | null } {
  if (!records || records.length === 0) return { valid: true, brokenAtIndex: null };

  // Sort by sequence just in case
  const sortedRecords = [...records].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  for (let i = 0; i < sortedRecords.length; i++) {
    const record = sortedRecords[i];
    
    // Check genesis or previous hash link
    if (i === 0) {
      if (record.previousHash !== '0'.repeat(64)) {
        return { valid: false, brokenAtIndex: i };
      }
    } else {
      if (record.previousHash !== sortedRecords[i - 1].currentHash) {
        return { valid: false, brokenAtIndex: i };
      }
    }

    // Check payload hasn't been tampered with
    const expectedHash = createHash(record.payload, record.previousHash);
    if (record.currentHash !== expectedHash) {
      return { valid: false, brokenAtIndex: i };
    }
  }

  return { valid: true, brokenAtIndex: null };
}
