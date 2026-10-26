// Draws (or redraws) the winner, creates their WooCommerce coupon if
// configured, and tells them by email, in-app message and push.
import { adminClient, handler, json, requireAdmin } from '../_shared/clients.ts';
import { emailLayout, escapeHtml, sendEmail, siteUrl } from '../_shared/email.ts';
import { pushToUser } from '../_shared/push.ts';
import { createWinnerCoupon } from '../_shared/woocommerce.ts';

const errors: Record<string, string> = {
  'no eligible entries': 'Nu există participanți eligibili.',
  'giveaway has not been published': 'Giveaway-ul nu a fost publicat.',
  'giveaway already has a winner; forfeit it before redrawing': 'Giveaway-ul are deja un câștigător.',
};

Deno.serve(
  handler(async (req) => {
    const { client } = await requireAdmin(req);
    const { giveaway_id } = await req.json();

    // Runs as the admin, so the database checks the role and logs who drew.
    const { data: win, error } = await client.rpc('draw_winner', { p_giveaway_id: giveaway_id });
    if (error) throw new Error(errors[error.message] ?? error.message);

    const db = adminClient();
    const [{ data: giveaway }, { data: winner }] = await Promise.all([
      db.from('giveaways').select('*').eq('id', giveaway_id).single(),
      db.from('profiles').select('id, email, display_name').eq('id', win.user_id).single(),
    ]);
    if (!giveaway || !winner) throw new Error('Tragerea s-a făcut, dar câștigătorul nu a fost găsit.');

    const coupon = await createWinnerCoupon({
      productId: giveaway.wc_product_id,
      discountRon: Number(giveaway.retail_price_ron) - Number(giveaway.giveaway_price_ron),
      email: winner.email,
    });
    if (coupon) await db.from('wins').update({ coupon_code: coupon }).eq('id', win.id);

    const price = `${Number(giveaway.giveaway_price_ron).toFixed(0)} lei`;
    const howToBuy = coupon
      ? `Cumpără produsul de pe lootshop.ro și folosește codul ${coupon} la finalizarea comenzii. Prețul final va fi ${price}.`
      : 'Te contactăm în curând cu pașii pentru a cumpăra produsul de pe lootshop.ro.';

    await db.from('messages').insert({
      user_id: winner.id,
      from_admin: true,
      giveaway_id,
      title: 'Ai câștigat!',
      body: `Felicitări! Ai câștigat ${giveaway.title} la ${price}. ${howToBuy}`,
    });

    let emailSent = false;
    if (winner.email) {
      const productLink = giveaway.product_url
        ? `<p><a href="${escapeHtml(giveaway.product_url)}" style="display:inline-block;background:#e4002b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Vezi produsul pe lootshop.ro</a></p>`
        : '';
      emailSent = await sendEmail(
        winner.email,
        `Ai câștigat: ${giveaway.title}`,
        emailLayout(
          'Felicitări, ai câștigat!',
          `<p>Salut ${escapeHtml(winner.display_name ?? '')},</p>
           <p>Ai câștigat giveaway-ul <b>${escapeHtml(giveaway.title)}</b>. Poți cumpăra produsul la doar <b>${price}</b>.</p>
           <p>${coupon ? `Cumpără produsul de pe lootshop.ro și folosește codul <b style="font-family:monospace;font-size:18px">${coupon}</b> la finalizarea comenzii.` : escapeHtml(howToBuy)}</p>
           ${productLink}
           <p>Ne poți răspunde la acest email sau din <a href="${siteUrl()}/inbox/">Mesaje</a>.</p>`,
        ),
      );
    }

    await pushToUser(db, winner.id, {
      title: 'Ai câștigat! 🎉',
      body: `${giveaway.title} la ${price}. Apasă pentru detalii.`,
      url: 'inbox/',
    });

    return json({ ok: true, win_id: win.id, winner_name: winner.display_name ?? winner.email, coupon, email_sent: emailSent });
  }),
);
