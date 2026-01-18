import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/officers/clear-locks
 *
 * Clears all existing locks on officers that are in 'being_reviewed' status.
 * This is a cleanup operation to be run before starting validation.
 *
 * Response:
 * {
 *   "success": true,
 *   "clearedCount": 5,
 *   "message": "Cleared 5 locks"
 * }
 */
export async function POST() {
  try {
    // Find all officers that are currently locked (being_reviewed_by is not null)
    // and reset them to pending status
    const { data: lockedOfficers, error: selectError } = await supabase
      .from('officer_validations')
      .select('mention_uid, being_reviewed_by')
      .not('being_reviewed_by', 'is', null);

    if (selectError) {
      console.error('Error fetching locked officers:', selectError);
      return NextResponse.json(
        {
          success: false,
          clearedCount: 0,
          message: `Database error: ${selectError.message}`,
        },
        { status: 500 }
      );
    }

    const clearedCount = lockedOfficers?.length || 0;

    if (clearedCount === 0) {
      return NextResponse.json(
        {
          success: true,
          clearedCount: 0,
          message: 'No locks to clear',
        },
        { status: 200 }
      );
    }

    // Clear all locks using raw SQL for JSONB update
    const { error: updateError } = await supabase.rpc('clear_all_locks');

    if (updateError) {
      console.error('Error clearing locks:', updateError);
      return NextResponse.json(
        {
          success: false,
          clearedCount: 0,
          message: `Database error: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        clearedCount,
        message: `Cleared ${clearedCount} lock${clearedCount === 1 ? '' : 's'}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in clear-locks endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        clearedCount: 0,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
