'use server';

import { createClient } from '@/lib/supabase/server';

type SerializedSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function saveSubscription(sub: SerializedSubscription, userAgent: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Trebuie să fii autentificat.' };

  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: sub.endpoint,
    user_id: user.id,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: userAgent.slice(0, 300),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  await supabase.from('profiles').update({ notifications_opt_in: true }).eq('id', user.id);
  return { ok: true };
}

export async function removeSubscription(endpoint: string) {
  const supabase = await createClient();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return { ok: true };
}
