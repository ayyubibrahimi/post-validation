import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ClaimOfficerRequest, ClaimOfficerResponse } from '@/lib/types';

/**
 * POST /api/officers/claim
 *
 * Claims the next available officer for validation.
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
 *   "message": "Officer claimed successfully" | "No officers available"
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

    // Call the SQL function to claim next officer atomically
    const { data, error } = await supabase.rpc('claim_next_officer', {
      validator_id: validatorId,
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
          message: 'No officers available for review',
        } as ClaimOfficerResponse,
        { status: 200 }
      );
    }

    // Return claimed officer
    return NextResponse.json(
      {
        success: true,
        officer: data,
        message: 'Officer claimed successfully',
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
