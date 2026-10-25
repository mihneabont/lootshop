import 'server-only';

import webpush from 'web-push';

import { createAdminClient } from '@/lib/supabase/admin';

let configured = false;
function configure() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn('VAPID keys not set; skipping push');
    return false;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:contact@lootshop.ro', publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string };

type Row = { endpoint: string; p256dh: string; auth: string };

async function sendToRows(rows: Row[], payload: PushPayload) {
  if (!configure() || rows.length === 0) return 0;
  const db = createAdminClient();
  const body = JSON.stringify(payload);
  let sent = 0;
  const expired: string[] = [];

  // Small batches keep a big audience from opening thousands of connections at once.
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

export async function pushToUser(userId: string, payload: PushPayload) {
  const { data } = await createAdminClient()
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);
  return sendToRows(data ?? [], payload);
}

export async function pushToEveryone(payload: PushPayload) {
  const { data, error } = await createAdminClient()
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, profiles!inner(notifications_opt_in)')
    .eq('profiles.notifications_opt_in', true);
  if (error) throw error;
  return sendToRows(data ?? [], payload);
}
