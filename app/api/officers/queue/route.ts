import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { QueueStatus } from '@/lib/types';

/**
 * GET /api/officers/queue?validatorId=user_123
 *
 * Returns queue status information:
 * - Available officers (pending, not locked)
 * - Officers in review (locked by any validator)
 * - Current validator's officer info
 *
 * Response:
 * {
 *   "available": 750,
 *   "inReview": 50,
 *   "yourOfficer": {
 *     "mention_uid": "...",
 *     "officer_name": "MICHAEL WEBB",
 *     "started_at": "2026-01-17T14:30:00Z",
 *     "time_elapsed_minutes": 15
 *   } | null
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get validatorId from query params
    const { searchParams } = new URL(request.url);
    const validatorId = searchParams.get('validatorId');

    // Count available officers (pending and not locked)
    const { count: availableCount, error: availableError } = await supabase
      .from('officer_validations')
      .select('*', { count: 'exact', head: true })
      .eq('data->validation->>status', 'pending')
      .is('being_reviewed_by', null);

    if (availableError) {
      console.error('Error counting available officers:', availableError);
      return NextResponse.json(
        {
          error: `Database error: ${availableError.message}`,
        },
        { status: 500 }
      );
    }

    // Count officers in review (locked by any validator)
    const { count: inReviewCount, error: inReviewError } = await supabase
      .from('officer_validations')
      .select('*', { count: 'exact', head: true })
      .not('being_reviewed_by', 'is', null);

    if (inReviewError) {
      console.error('Error counting officers in review:', inReviewError);
      return NextResponse.json(
        {
          error: `Database error: ${inReviewError.message}`,
        },
        { status: 500 }
      );
    }

    // If validatorId is provided, get their current officer
    let yourOfficer = null;

    if (validatorId) {
      const { data: currentOfficer, error: officerError } = await supabase
        .from('officer_validations')
        .select('mention_uid, data, being_reviewed_at')
        .eq('being_reviewed_by', validatorId)
        .maybeSingle();

      if (officerError) {
        console.error('Error fetching validator officer:', officerError);
        // Don't fail the whole request, just log the error
      } else if (currentOfficer) {
        // Calculate time elapsed
        const startedAt = new Date(currentOfficer.being_reviewed_at);
        const now = new Date();
        const timeElapsedMinutes = Math.floor(
          (now.getTime() - startedAt.getTime()) / 60000
        );

        // Extract officer name from data
        const officerInfo = currentOfficer.data?.officer_info;
        const officerName = officerInfo
          ? `${officerInfo.first_name}${
              officerInfo.middle_name ? ' ' + officerInfo.middle_name : ''
            } ${officerInfo.last_name}`
          : 'Unknown Officer';

        yourOfficer = {
          mention_uid: currentOfficer.mention_uid,
          officer_name: officerName,
          started_at: currentOfficer.being_reviewed_at,
          time_elapsed_minutes: timeElapsedMinutes,
        };
      }
    }

    // Return queue status
    const queueStatus: QueueStatus = {
      available: availableCount ?? 0,
      inReview: inReviewCount ?? 0,
      yourOfficer,
    };

    return NextResponse.json(queueStatus, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in queue endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
