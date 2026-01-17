import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We're not using auth for this dashboard
  },
});

// Test connection function (optional, for debugging)
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('officer_validations')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }

    console.log('Supabase connected successfully');
    return true;
  } catch (err) {
    console.error('Supabase connection failed:', err);
    return false;
  }
}
