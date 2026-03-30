import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ValidateOfficerRequest, ValidateOfficerResponse } from '@/lib/types';

/**
 * POST /api/officers/validate
 *
 * Validates an officer match (correct/incorrect/needs_review).
 * Updates status, releases lock, and stores validation metadata.
 *
 * Request body:
 * {
 *   "mentionUid": "...",
 *   "validatorId": "user_123",
 *   "status": "correct" | "incorrect" | "needs_review",
 *   "notes": "Optional notes"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "officer": { ... },
 *   "message": "Validation saved successfully"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ValidateOfficerRequest = await request.json();
    const {
      mentionUid,
      validatorId,
      status,
      notes,
      officer_match_notes,
      agency_citation_notes,
      incident_date_notes,
      corrections,
      custom_citations,
    } = body;

    // Validate input
    if (!mentionUid || !validatorId || !status) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: mentionUid, validatorId, or status',
        },
        { status: 400 }
      );
    }

    if (!['correct', 'incorrect', 'needs_review'].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid status. Must be: correct, incorrect, or needs_review',
        },
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
          message: currentOfficer
            ? 'Officer not found or not locked by this validator'
            : `Database error: ${fetchError?.message}`,
        },
        { status: 404 }
      );
    }

    // Update the validation data
    const updatedData = {
      ...currentOfficer.data,
      validation: {
        status,
        validated_by: validatorId,
        validated_at: new Date().toISOString(),
        notes: notes || null,
        officer_match_notes: officer_match_notes || null,
        agency_citation_notes: agency_citation_notes || null,
        incident_date_notes: incident_date_notes || null,
      },
      corrections: corrections
        ? { ...corrections, corrected_by: validatorId, corrected_at: new Date().toISOString() }
        : (currentOfficer.data.corrections || null),
      custom_citations: custom_citations ?? currentOfficer.data.custom_citations ?? null,
    };

    // Update the officer with validation and release lock
    const { data: updatedOfficer, error: updateError } = await supabase
      .from('officer_validations')
      .update({
        being_reviewed_by: null,
        being_reviewed_at: null,
        data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('mention_uid', mentionUid)
      .eq('being_reviewed_by', validatorId)
      .select()
      .single();

    if (updateError) {
      console.error('Error validating officer:', updateError);
      return NextResponse.json(
        {
          success: false,
          message: `Database error: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    if (!updatedOfficer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update officer. It may have been released by another process.',
        },
        { status: 409 }
      );
    }

    // Return success with updated officer
    return NextResponse.json(
      {
        success: true,
        officer: updatedOfficer,
        message: 'Validation saved successfully',
      } as ValidateOfficerResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in validate endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
