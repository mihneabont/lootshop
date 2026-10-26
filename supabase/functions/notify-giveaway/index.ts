// Publishes a giveaway and, if asked, notifies everyone who opted in.
import { adminClient, handler, json, requireAdmin } from '../_shared/clients.ts';
import { pushToEveryone } from '../_shared/push.ts';

Deno.serve(
  handler(async (req) => {
    await requireAdmin(req);
    const { giveaway_id, notify = true } = await req.json();
    const db = adminClient();

    const { data: g, error } = await db
      .from('giveaways')
      .update({ status: 'open', ...(notify ? { notified_at: new Date().toISOString() } : {}) })
      .eq('id', giveaway_id)
      .in('status', ['draft', 'open'])
      .select()
      .single();
    if (error) throw error;

    const sent = notify
      ? await pushToEveryone(db, {
          title: 'Giveaway nou!',
          body: `${g.title} la doar ${Number(g.giveaway_price_ron).toFixed(0)} lei. Înscrie-te gratuit acum.`,
          url: `giveaway/?id=${g.id}`,
        })
      : 0;

    return json({ ok: true, sent });
  }),
);
