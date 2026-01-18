import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ClaimOfficerRequest, ClaimOfficerResponse } from '@/lib/types';

/**
 * POST /api/officers/claim
 *
 * Claims the next available officer for validation.
 * Auto-marks any currently locked officer as 'skipped' if not validated.
 * Uses atomic transaction via claim_next_officer SQL function.
 *
 * Request body:
 * {
 *   "validatorId": "user_123"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "officer": { ... } | null,
 *   "message": "Officer claimed successfully" | "No officers available",
 *   "autoReleased": true | false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ClaimOfficerRequest = await request.json();
    const { validatorId } = body;

    // Validate input
    if (!validatorId || typeof validatorId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          officer: null,
          message: 'Invalid validator ID',
        } as ClaimOfficerResponse,
        { status: 400 }
      );
    }

    // Check if validator currently has an officer locked
    const { data: currentOfficer } = await supabase
      .from('officer_validations')
      .select('*')
      .eq('being_reviewed_by', validatorId)
      .single();

    let autoReleased = false;
    let excludedMentionUid: string | null = null;

    // If they have an officer locked and it hasn't been validated, mark it as skipped
    if (currentOfficer) {
      const validationStatus = currentOfficer.data?.validation?.status;

      // Only mark as skipped if status is 'being_reviewed' (not validated yet)
      if (validationStatus === 'being_reviewed') {
        const { error: releaseError } = await supabase
          .from('officer_validations')
          .update({
            being_reviewed_by: null,
            being_reviewed_at: null,
            data: {
              ...currentOfficer.data,
              validation: {
                ...currentOfficer.data.validation,
                status: 'skipped',
              },
            },
            updated_at: new Date().toISOString(),
          })
          .eq('mention_uid', currentOfficer.mention_uid);

        if (releaseError) {
          console.error('Error marking officer as skipped:', releaseError);
          // Continue anyway - we'll still try to claim the next one
        } else {
          autoReleased = true;
          // Exclude the just-skipped officer from the next claim
          excludedMentionUid = currentOfficer.mention_uid;
        }
      }
    }

    // Call the SQL function to claim next officer atomically
    // Pass the excluded mention_uid to prevent re-claiming the just-released officer
    const { data, error } = await supabase.rpc('claim_next_officer', {
      validator_id: validatorId,
      excluded_mention_uid: excludedMentionUid,
    });

    if (error) {
      console.error('Error claiming officer:', error);
      return NextResponse.json(
        {
          success: false,
          officer: null,
          message: `Database error: ${error.message}`,
        } as ClaimOfficerResponse,
        { status: 500 }
      );
    }

    // If no officer returned, none are available
    if (!data) {
      return NextResponse.json(
        {
          success: true,
          officer: null,
          message: autoReleased
            ? 'Previous officer skipped. No officers available for review.'
            : 'No officers available for review',
          autoReleased,
        } as ClaimOfficerResponse,
        { status: 200 }
      );
    }

    // Return claimed officer
    return NextResponse.json(
      {
        success: true,
        officer: data,
        message: autoReleased
          ? 'Previous officer skipped. New officer claimed successfully.'
          : 'Officer claimed successfully',
        autoReleased,
      } as ClaimOfficerResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in claim endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        officer: null,
        message: 'Internal server error',
      } as ClaimOfficerResponse,
      { status: 500 }
    );
  }
}
