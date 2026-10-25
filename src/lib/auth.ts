import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

// Cached per request, so layouts and pages can both call it.
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { supabase, user, profile: profile as Profile | null };
});

export async function requireUser(next = '/') {
  const session = await getSession();
  if (!session.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session as typeof session & { user: NonNullable<typeof session.user> };
}

export async function requireAdmin() {
  const session = await requireUser('/admin');
  if (session.profile?.role !== 'admin') redirect('/');
  return session;
}
