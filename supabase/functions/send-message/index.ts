// Sends a message from the shop to one user: in the app, by push, and
// optionally by email.
import { adminClient, handler, json, requireAdmin } from '../_shared/clients.ts';
import { emailLayout, escapeHtml, sendEmail, siteUrl } from '../_shared/email.ts';
import { pushToUser } from '../_shared/push.ts';

Deno.serve(
  handler(async (req) => {
    await requireAdmin(req);
    const { user_id, body, giveaway_id, also_email } = await req.json();
    const text = String(body ?? '').trim().slice(0, 4000);
    if (!user_id || !text) throw new Error('Mesajul este gol.');

    const db = adminClient();
    const { error } = await db
      .from('messages')
      .insert({ user_id, from_admin: true, giveaway_id: giveaway_id ?? null, body: text });
    if (error) throw error;

    // Writing to a winner about their giveaway counts as contacting them.
    if (giveaway_id) {
      await db
        .from('wins')
        .update({ status: 'contacted', updated_at: new Date().toISOString() })
        .eq('giveaway_id', giveaway_id)
        .eq('user_id', user_id)
        .eq('status', 'pending');
    }

    await pushToUser(db, user_id, { title: 'Mesaj nou de la Loot Shop', body: text.slice(0, 140), url: 'inbox/' });

    let emailSent = false;
    if (also_email) {
      const { data: profile } = await db.from('profiles').select('email').eq('id', user_id).single();
      if (profile?.email) {
        emailSent = await sendEmail(
          profile.email,
          'Mesaj de la Loot Shop',
          emailLayout(
            'Mesaj de la Loot Shop',
            `<p style="white-space:pre-wrap">${escapeHtml(text)}</p><p><a href="${siteUrl()}/inbox/">Răspunde în aplicație</a> sau direct la acest email.</p>`,
          ),
        );
      }
    }

    return json({ ok: true, email_sent: emailSent });
  }),
);
