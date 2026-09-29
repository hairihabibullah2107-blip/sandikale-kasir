import { createClient } from '@supabase/supabase-js';

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://zwtjqtwidfezvfhxmkyf.supabase.co';

export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_6k86xVDOm5EUkHCTtABXTQ_-_Y_mz0f';

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
