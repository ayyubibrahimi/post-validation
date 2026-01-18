import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/officers/[mentionUid]
 *
 * Fetches a single officer by mention_uid
 * Used as fallback when officer isn't in React Query cache
 *
 * Response:
 * {
 *   "success": true,
 *   "officer": { ... }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mentionUid: string }> }
) {
  try {
    const { mentionUid } = await params;

    if (!mentionUid) {
      return NextResponse.json(
        {
          success: false,
          officer: null,
          message: 'Mention UID is required',
        },
        { status: 400 }
      );
    }

    // Fetch officer from database
    const { data: officer, error } = await supabase
      .from('officer_validations')
      .select('*')
      .eq('mention_uid', mentionUid)
      .single();

    if (error || !officer) {
      return NextResponse.json(
        {
          success: false,
          officer: null,
          message: 'Officer not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        officer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in get officer endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        officer: null,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
