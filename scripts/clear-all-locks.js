#!/usr/bin/env node

/**
 * Clear All Locks Script
 *
 * This script clears all existing locks on officers in the database.
 * Use this before starting validation to ensure no orphaned locks exist.
 *
 * Usage:
 *   node scripts/clear-all-locks.js
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function clearAllLocks() {
  console.log('🧹 Clearing all locks...\n');

  try {
    const response = await fetch(`${API_BASE_URL}/api/officers/clear-locks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Failed to clear locks:', errorData.message);
      process.exit(1);
    }

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.message}`);
      console.log(`   Cleared: ${data.clearedCount} lock(s)\n`);
    } else {
      console.error('❌ Operation failed:', data.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
clearAllLocks();
