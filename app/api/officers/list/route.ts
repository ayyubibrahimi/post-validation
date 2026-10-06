import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/officers/list?validatorId=Tarak
 *
 * Returns the reviewer's assigned officers (their validation-set allocation) as
 * a lightweight list for the sidebar. No claiming/locking — reviewers navigate
 * freely because each reviewer owns a distinct set of rows.
 *
 * Response:
 * {
 *   "officers": [
 *     { "mention_uid": "...", "officer_name": "MICHAEL WEBB",
 *       "matched_post_id": "B05-C48", "status": "pending" },
 *     ...
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validatorId = searchParams.get('validatorId');

    if (!validatorId) {
      return NextResponse.json({ error: 'validatorId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('officer_validations')
      .select('mention_uid, data')
      .eq('assigned_to', validatorId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error listing officers:', error);
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    const officers = (data ?? []).map((row) => {
      const info = row.data?.officer_info ?? {};
      const name = [info.first_name, info.middle_name, info.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      return {
        mention_uid: row.mention_uid,
        officer_name: name || 'Unknown Officer',
        matched_post_id: info.matched_post_id ?? null,
        status: row.data?.validation?.status ?? 'pending',
      };
    });

    return NextResponse.json({ officers }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in list endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
