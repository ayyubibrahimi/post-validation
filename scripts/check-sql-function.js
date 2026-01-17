/**
 * Check if the claim_next_officer SQL function exists in Supabase
 *
 * Run with: node scripts/check-sql-function.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFunction() {
  console.log('🔍 Checking if claim_next_officer function exists...\n');

  try {
    // Try to call the function with a test validator ID
    const { data, error } = await supabase.rpc('claim_next_officer', {
      validator_id: 'test_check_' + Date.now(),
    });

    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('❌ Function does NOT exist in database');
        console.log('\n📋 To create the function:');
        console.log('   1. Go to: https://supabase.com/dashboard/project/wcdozjrufdrhkdftqiwb/sql');
        console.log('   2. Copy the SQL from: supabase/migrations/002_create_claim_function.sql');
        console.log('   3. Paste and execute in the SQL Editor\n');
        return false;
      } else {
        console.log('⚠️  Function exists but returned an error:', error.message);
        console.log('   This might be expected if there are no officers in the database.');
        return true;
      }
    }

    console.log('✅ Function exists and is working!');
    if (data) {
      console.log('   Claimed officer:', data.mention_uid);
    } else {
      console.log('   No officers available (this is normal if database is empty)');
    }
    return true;

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

checkFunction().then(exists => {
  process.exit(exists ? 0 : 1);
});
