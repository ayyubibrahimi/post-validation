/**
 * Script to apply SQL migrations to Supabase
 *
 * This script reads the SQL migration file and executes it using the Supabase client.
 * Run with: node scripts/apply-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');

    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/002_create_claim_function.sql'
    );

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration to Supabase...');
    console.log('SQL:\n', sql);

    // Execute the SQL using Supabase RPC
    // Note: This requires the SQL to be executed as a raw query
    // Since we're using the anon key, we may need to use the service role key for DDL

    console.log('\n⚠️  Note: This migration creates a SQL function.');
    console.log('⚠️  You may need to apply this manually in the Supabase SQL Editor if the anon key lacks permissions.');
    console.log('\n📋 To apply manually:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/wcdozjrufdrhkdftqiwb/sql');
    console.log('   2. Copy the SQL from: supabase/migrations/002_create_claim_function.sql');
    console.log('   3. Paste and run in the SQL Editor\n');

    // Try to execute via RPC (this might not work with anon key)
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Error applying migration:', error.message);
      console.log('\n💡 Please apply the migration manually in the Supabase SQL Editor.');
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('Data:', data);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

applyMigration();
