/**
 * Test script for API endpoints
 *
 * This script tests all 5 API endpoints to ensure they work correctly.
 * Run with: node scripts/test-api-endpoints.js
 *
 * Prerequisites:
 * 1. Next.js dev server must be running (npm run dev)
 * 2. SQL function claim_next_officer must be created in Supabase
 */

const BASE_URL = 'http://localhost:3000';

// Test data
const validatorId = 'test_validator_' + Date.now();

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function success(message) {
  log(colors.green, '✓', message);
}

function error(message) {
  log(colors.red, '✗', message);
}

function info(message) {
  log(colors.cyan, 'ℹ', message);
}

function warn(message) {
  log(colors.yellow, '⚠', message);
}

// Test functions
async function testStatsEndpoint() {
  console.log('\n' + colors.blue + '═══ Testing GET /api/officers/stats ═══' + colors.reset);

  try {
    const response = await fetch(`${BASE_URL}/api/officers/stats`);
    const data = await response.json();

    if (response.ok) {
      success('Stats endpoint responding');
      console.log('  Response:', JSON.stringify(data, null, 2));

      // Validate response structure
      const requiredFields = ['total', 'pending', 'inReview', 'validated', 'correct', 'incorrect', 'needsReview', 'successRate'];
      const hasAllFields = requiredFields.every(field => field in data);

      if (hasAllFields) {
        success('All required fields present');
      } else {
        warn('Missing some fields in response');
      }

      return true;
    } else {
      error(`Stats endpoint failed: ${response.status}`);
      console.log('  Response:', data);
      return false;
    }
  } catch (err) {
    error(`Stats endpoint error: ${err.message}`);
    return false;
  }
}

async function testQueueEndpoint() {
  console.log('\n' + colors.blue + '═══ Testing GET /api/officers/queue ═══' + colors.reset);

  try {
    const response = await fetch(`${BASE_URL}/api/officers/queue?validatorId=${validatorId}`);
    const data = await response.json();

    if (response.ok) {
      success('Queue endpoint responding');
      console.log('  Response:', JSON.stringify(data, null, 2));

      // Validate response structure
      if ('available' in data && 'inReview' in data) {
        success('Queue status fields present');
      } else {
        warn('Missing fields in queue response');
      }

      return true;
    } else {
      error(`Queue endpoint failed: ${response.status}`);
      console.log('  Response:', data);
      return false;
    }
  } catch (err) {
    error(`Queue endpoint error: ${err.message}`);
    return false;
  }
}

async function testClaimEndpoint() {
  console.log('\n' + colors.blue + '═══ Testing POST /api/officers/claim ═══' + colors.reset);

  try {
    const response = await fetch(`${BASE_URL}/api/officers/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        validatorId,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      success('Claim endpoint responding');
      console.log('  Response:', JSON.stringify(data, null, 2));

      if (data.officer) {
        success('Officer claimed successfully');
        info(`Claimed officer: ${data.officer.mention_uid}`);
        return data.officer;
      } else {
        warn('No officers available to claim');
        return null;
      }
    } else {
      error(`Claim endpoint failed: ${response.status}`);
      console.log('  Response:', data);
      return null;
    }
  } catch (err) {
    error(`Claim endpoint error: ${err.message}`);
    return null;
  }
}

async function testReleaseEndpoint(mentionUid) {
  console.log('\n' + colors.blue + '═══ Testing POST /api/officers/release ═══' + colors.reset);

  if (!mentionUid) {
    warn('Skipping release test - no officer to release');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/officers/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mentionUid,
        validatorId,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      success('Release endpoint responding');
      success('Officer released successfully');
      console.log('  Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      error(`Release endpoint failed: ${response.status}`);
      console.log('  Response:', data);
      return false;
    }
  } catch (err) {
    error(`Release endpoint error: ${err.message}`);
    return false;
  }
}

async function testValidateEndpoint(mentionUid) {
  console.log('\n' + colors.blue + '═══ Testing POST /api/officers/validate ═══' + colors.reset);

  if (!mentionUid) {
    warn('Skipping validate test - no officer to validate');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/officers/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mentionUid,
        validatorId,
        status: 'correct',
        notes: 'Test validation from automated test script',
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      success('Validate endpoint responding');
      success('Officer validated successfully');
      console.log('  Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      error(`Validate endpoint failed: ${response.status}`);
      console.log('  Response:', data);
      return false;
    }
  } catch (err) {
    error(`Validate endpoint error: ${err.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log(colors.cyan + '\n╔═══════════════════════════════════════════╗');
  console.log('║  API Endpoints Test Suite                ║');
  console.log('╚═══════════════════════════════════════════╝' + colors.reset);

  info(`Using validator ID: ${validatorId}`);
  info(`Base URL: ${BASE_URL}`);

  const results = {
    passed: 0,
    failed: 0,
  };

  // Test 1: Stats endpoint
  const statsOk = await testStatsEndpoint();
  statsOk ? results.passed++ : results.failed++;

  // Test 2: Queue endpoint
  const queueOk = await testQueueEndpoint();
  queueOk ? results.passed++ : results.failed++;

  // Test 3: Claim endpoint
  const claimedOfficer = await testClaimEndpoint();
  claimedOfficer ? results.passed++ : results.failed++;

  // Test 4 & 5: Release or Validate (depending on if we claimed an officer)
  if (claimedOfficer) {
    // Test release first
    const releaseOk = await testReleaseEndpoint(claimedOfficer.mention_uid);
    releaseOk ? results.passed++ : results.failed++;

    // Re-claim the same officer if possible for validate test
    info('\nRe-claiming officer for validate test...');
    const reclaimedOfficer = await testClaimEndpoint();

    if (reclaimedOfficer) {
      // Test validate
      const validateOk = await testValidateEndpoint(reclaimedOfficer.mention_uid);
      validateOk ? results.passed++ : results.failed++;
    } else {
      warn('Could not re-claim officer for validate test');
      results.failed++;
    }
  } else {
    warn('Skipping release and validate tests - no officer claimed');
    results.failed += 2;
  }

  // Summary
  console.log('\n' + colors.cyan + '╔═══════════════════════════════════════════╗');
  console.log('║  Test Results Summary                    ║');
  console.log('╚═══════════════════════════════════════════╝' + colors.reset);

  console.log(`\n  Total tests: ${results.passed + results.failed}`);
  success(`Passed: ${results.passed}`);

  if (results.failed > 0) {
    error(`Failed: ${results.failed}`);
    console.log('\n' + colors.red + '❌ Some tests failed' + colors.reset + '\n');
    process.exit(1);
  } else {
    console.log('\n' + colors.green + '✅ All tests passed!' + colors.reset + '\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch(err => {
  error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
