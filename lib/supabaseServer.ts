import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createServerSupabaseClient() {
  // For now we use anon key.
  // Later you’ll switch to a proper server client with cookies.
  return createClient(supabaseUrl, supabaseAnonKey)
}
