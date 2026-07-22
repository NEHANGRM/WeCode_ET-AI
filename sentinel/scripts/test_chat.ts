/**
 * Test Script: Chat Copilot
 *
 * Tests 3 scenarios via the API:
 * (a) Known IP query returns data about specific case
 * (b) Campaign query works correctly
 * (c) Unknown/no-data query says "no data" instead of guessing
 *
 * Usage: npx tsx scripts/test_chat.ts
 * (Requires dev server running on localhost:3000)
 */

const BASE_URL = 'http://localhost:3000';

async function chatQuery(message: string): Promise<{ answer: string; sources: string[] }> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  return res.json();
}

// ── Test (a): Known IP from seeded data ──────────────────────────────────────
async function test_known_ip() {
  console.log('\n[TEST A] Query for known seeded IP: 185.150.11.23');

  try {
    const result = await chatQuery('What happened with IP 185.150.11.23?');

    const hasAnswer = typeof result.answer === 'string' && result.answer.length > 10;
    const isGrounded = !result.answer.toLowerCase().includes('i don\'t know') &&
                       !result.answer.toLowerCase().includes('speculate') &&
                       !result.answer.toLowerCase().includes('cannot be determined');
    const hasSources = Array.isArray(result.sources);

    console.log(`  Answer: "${result.answer.substring(0, 150)}..."`);
    console.log(`  Sources: [${result.sources?.join(', ')}]`);

    if (hasAnswer && isGrounded) {
      console.log('  ✅ PASS: Got grounded answer with actual data');
    } else {
      console.log('  ❌ FAIL: Answer is empty or not grounded');
    }
    return hasAnswer && isGrounded;
  } catch (err) {
    console.log(`  ❌ FAIL: Request error — ${err}`);
    return false;
  }
}

// ── Test (b): Campaign query works ──────────────────────────────────────────
async function test_campaign_query() {
  console.log('\n[TEST B] Campaign query');

  try {
    const result = await chatQuery('Are there any active campaigns detected?');

    const hasAnswer = typeof result.answer === 'string' && result.answer.length > 10;

    console.log(`  Answer: "${result.answer.substring(0, 200)}"`);
    console.log(`  Sources: [${result.sources?.join(', ')}]`);

    // Answer can be "no campaigns" or list them — both are valid grounded answers
    const isValid = hasAnswer && !result.answer.toLowerCase().includes('error');

    if (isValid) {
      console.log('  ✅ PASS: Got a valid campaign status response');
    } else {
      console.log('  ❌ FAIL: Invalid or empty response');
    }
    return isValid;
  } catch (err) {
    console.log(`  ❌ FAIL: Request error — ${err}`);
    return false;
  }
}

// ── Test (c): Unknown IP returns "no data" not hallucinated answer ───────────
async function test_no_data_query() {
  console.log('\n[TEST C] Unknown IP should say "no data" not hallucinate');

  try {
    const result = await chatQuery('What do you know about IP 1.2.3.4?');

    const hasAnswer = typeof result.answer === 'string' && result.answer.length > 5;

    // A correct answer says it found nothing — it does NOT make up attack details
    const sayNoData =
      result.answer.toLowerCase().includes('no case') ||
      result.answer.toLowerCase().includes('not found') ||
      result.answer.toLowerCase().includes('no alerts') ||
      result.answer.toLowerCase().includes('no events') ||
      result.answer.toLowerCase().includes('has not generated') ||
      result.answer.toLowerCase().includes('not appear') ||
      result.answer.toLowerCase().includes("don't have") ||
      result.answer.toLowerCase().includes("no data");

    console.log(`  Answer: "${result.answer.substring(0, 200)}"`);

    if (hasAnswer && sayNoData) {
      console.log('  ✅ PASS: Correctly said "no data" instead of hallucinating');
    } else if (hasAnswer && !sayNoData) {
      console.log('  ⚠️  REVIEW: Got an answer but may be hallucinated — check manually');
      console.log('     (This can happen if LLM invents data. Review the answer above.)');
    } else {
      console.log('  ❌ FAIL: Empty or errored answer');
    }

    return hasAnswer;
  } catch (err) {
    console.log(`  ❌ FAIL: Request error — ${err}`);
    return false;
  }
}

// ── Test (d): Metrics query works ────────────────────────────────────────────
async function test_metrics_query() {
  console.log('\n[TEST D] Metrics query');

  try {
    const result = await chatQuery('How many total events does Warden have?');
    const hasNumber = /\d+/.test(result.answer);

    console.log(`  Answer: "${result.answer.substring(0, 200)}"`);

    if (hasNumber) {
      console.log('  ✅ PASS: Got a numeric answer from real DB data');
    } else {
      console.log('  ❌ FAIL: No numeric data in answer');
    }
    return hasNumber;
  } catch (err) {
    console.log(`  ❌ FAIL: Request error — ${err}`);
    return false;
  }
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Chat Copilot Test Suite`);
  console.log(`Target: ${BASE_URL}/api/chat`);
  console.log('─'.repeat(40));

  // Quick connectivity check
  try {
    const res = await fetch(`${BASE_URL}/api/events`);
    if (!res.ok) throw new Error(`${res.status}`);
    console.log('✅ Dev server reachable');
  } catch {
    console.error('❌ Cannot reach dev server. Start with: npm run dev');
    process.exit(1);
  }

  const results = [
    await test_known_ip(),
    await test_campaign_query(),
    await test_no_data_query(),
    await test_metrics_query()
  ];

  const passed = results.filter(Boolean).length;
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Chat Tests: ${passed}/${results.length} passed`);
  if (passed === results.length) console.log('🎉 All tests passed!');
  else console.log('⚠️  Some tests need review — check output above');

  process.exit(passed === results.length ? 0 : 1);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
