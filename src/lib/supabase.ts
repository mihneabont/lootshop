import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;

export const isConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

// One browser client for the whole app. The site is static, so everything
// runs in the browser and row-level security in the database does the guarding.
export function supabase(): SupabaseClient {
  if (!isConfigured) throw new Error('Supabase is not configured');
  if (!client) {
    client = createClient(url!, key!, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

// Calls a Supabase Edge Function and surfaces its { error } body as an Error.
export async function callFunction<T = Record<string, unknown>>(name: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase().functions.invoke<T>(name, { body });
  if (error) {
    let message = error.message;
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const parsed = await context.json();
        if (parsed?.error) message = parsed.error;
      } catch {}
    }
    throw new Error(message);
  }
  return data as T;
}
