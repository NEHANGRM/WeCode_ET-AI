import { appendToChain } from '../hashChain';
import mongoose from 'mongoose';

/**
 * Record Agent: deterministic, no AI.
 * Wraps hashChain to provide a cleaner interface for the pipeline.
 */
export async function runRecord(
  eventId: mongoose.Types.ObjectId | string,
  agent: string,
  action: string,
  evidence?: any
) {
  return await appendToChain(eventId, agent, action, evidence);
}
