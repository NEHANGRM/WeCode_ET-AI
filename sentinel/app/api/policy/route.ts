import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const policyPath = join(process.cwd(), 'policy.json');
    const assetsPath = join(process.cwd(), 'assets.json');
    
    const policy = JSON.parse(readFileSync(policyPath, 'utf-8'));
    const assets = JSON.parse(readFileSync(assetsPath, 'utf-8'));

    return NextResponse.json({ policy, assets });
  } catch (error) {
    console.error('[Policy API] Error reading policy files:', error);
    return NextResponse.json({ error: 'Policy files not found' }, { status: 500 });
  }
}
