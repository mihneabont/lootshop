import 'server-only';

import { createClient } from '@supabase/supabase-js';

// Service-role client: bypasses row-level security. Only use after checking
// that the caller is allowed to do what is being done.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
