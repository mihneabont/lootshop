import webpush from 'npm:web-push@3.6.7';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type PushPayload = { title: string; body: string; url?: string };
type Row = { endpoint: string; p256dh: string; auth: string };

let configured = false;
function configure() {
  if (configured) return true;
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) {
    console.warn('VAPID keys not set; skipping push');
    return false;
  }
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@lootshop.ro', publicKey, privateKey);
  configured = true;
  return true;
}

// Sends to each subscription and removes the ones the browser says are gone.
async function sendToRows(db: SupabaseClient, rows: Row[], payload: PushPayload) {
  if (!configure() || rows.length === 0) return 0;
  const body = JSON.stringify(payload);
  const expired: string[] = [];
  let sent = 0;
  for (let i = 0; i < rows.length; i += 50) {
    await Promise.all(
      rows.slice(i, i + 50).map(async (r) => {
        try {
          await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, body, {
            TTL: 60 * 60 * 12,
          });
          sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) expired.push(r.endpoint);
          else console.error('Push failed', status, (e as Error).message);
        }
      }),
    );
  }
  if (expired.length) await db.from('push_subscriptions').delete().in('endpoint', expired);
  return sent;
}

export async function pushToUser(db: SupabaseClient, userId: string, payload: PushPayload) {
  const { data } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId);
  return sendToRows(db, data ?? [], payload);
}

export async function pushToEveryone(db: SupabaseClient, payload: PushPayload) {
  const { data, error } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, profiles!inner(notifications_opt_in)')
    .eq('profiles.notifications_opt_in', true);
  if (error) throw error;
  return sendToRows(db, data ?? [], payload);
}
