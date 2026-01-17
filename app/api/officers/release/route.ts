import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ReleaseOfficerRequest, ReleaseOfficerResponse } from '@/lib/types';

/**
 * POST /api/officers/release
 *
 * Releases an officer without validation.
 * Returns the officer to pending status and clears the lock.
 * Used when a validator wants to abandon review.
 *
 * Request body:
 * {
 *   "mentionUid": "...",
 *   "validatorId": "user_123"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Officer released successfully"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ReleaseOfficerRequest = await request.json();
    const { mentionUid, validatorId } = body;

    // Validate input
    if (!mentionUid || !validatorId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: mentionUid or validatorId',
        } as ReleaseOfficerResponse,
        { status: 400 }
      );
    }

    // First, fetch the current officer to get the existing data
    const { data: currentOfficer, error: fetchError } = await supabase
      .from('officer_validations')
      .select('*')
      .eq('mention_uid', mentionUid)
      .eq('being_reviewed_by', validatorId)
      .single();

    if (fetchError || !currentOfficer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Officer not found or not locked by this validator',
        } as ReleaseOfficerResponse,
        { status: 404 }
      );
    }

    // Update the validation status back to pending
    const updatedData = {
      ...currentOfficer.data,
      validation: {
        ...currentOfficer.data.validation,
        status: 'pending',
      },
    };

    // Release the lock and return to pending
    const { error: updateError } = await supabase
      .from('officer_validations')
      .update({
        being_reviewed_by: null,
        being_reviewed_at: null,
        data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('mention_uid', mentionUid)
      .eq('being_reviewed_by', validatorId);

    if (updateError) {
      console.error('Error releasing officer:', updateError);
      return NextResponse.json(
        {
          success: false,
          message: `Database error: ${updateError.message}`,
        } as ReleaseOfficerResponse,
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Officer released successfully',
      } as ReleaseOfficerResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in release endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      } as ReleaseOfficerResponse,
      { status: 500 }
    );
  }
}
