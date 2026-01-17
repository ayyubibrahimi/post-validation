import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ValidationStats } from '@/lib/types';

/**
 * GET /api/officers/stats
 *
 * Returns aggregate validation statistics across all officers.
 *
 * Response:
 * {
 *   "total": 1000,
 *   "pending": 750,
 *   "inReview": 50,
 *   "validated": 200,
 *   "correct": 180,
 *   "incorrect": 15,
 *   "needsReview": 5,
 *   "successRate": 0.923
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all officers with their validation status
    const { data: officers, error } = await supabase
      .from('officer_validations')
      .select('data, being_reviewed_by');

    if (error) {
      console.error('Error fetching stats:', error);
      return NextResponse.json(
        {
          error: `Database error: ${error.message}`,
        },
        { status: 500 }
      );
    }

    if (!officers || officers.length === 0) {
      // Return empty stats if no data
      return NextResponse.json(
        {
          total: 0,
          pending: 0,
          inReview: 0,
          validated: 0,
          correct: 0,
          incorrect: 0,
          needsReview: 0,
          successRate: 0,
        } as ValidationStats,
        { status: 200 }
      );
    }

    // Aggregate stats
    const stats = officers.reduce(
      (acc, row) => {
        acc.total++;

        const status = row.data?.validation?.status;

        if (status === 'pending') {
          acc.pending++;
        } else if (status === 'being_reviewed') {
          acc.inReview++;
          if (row.being_reviewed_by) {
            // Count as both in review and pending (not validated)
            acc.pending++;
          }
        } else if (status === 'correct') {
          acc.validated++;
          acc.correct++;
        } else if (status === 'incorrect') {
          acc.validated++;
          acc.incorrect++;
        } else if (status === 'needs_review') {
          acc.validated++;
          acc.needsReview++;
        }

        return acc;
      },
      {
        total: 0,
        pending: 0,
        inReview: 0,
        validated: 0,
        correct: 0,
        incorrect: 0,
        needsReview: 0,
      }
    );

    // Calculate success rate
    const totalDecisive = stats.correct + stats.incorrect;
    const successRate = totalDecisive > 0 ? stats.correct / totalDecisive : 0;

    const result: ValidationStats = {
      ...stats,
      successRate: Math.round(successRate * 1000) / 1000, // Round to 3 decimal places
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in stats endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
