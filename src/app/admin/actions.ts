'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';
import { emailLayout, escapeHtml, sendEmail } from '@/lib/email';
import { fromLocalInput } from '@/lib/format';
import { pushToEveryone, pushToUser } from '@/lib/push';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Giveaway, WinStatus } from '@/lib/types';
import { createWinnerCoupon } from '@/lib/woocommerce';

type Result = { ok: boolean; message?: string };

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? '';

function refresh(giveawayId?: string) {
  revalidatePath('/');
  revalidatePath('/admin');
  if (giveawayId) {
    revalidatePath(`/admin/giveaway/${giveawayId}`);
    revalidatePath(`/giveaway/${giveawayId}`);
  }
}

export async function saveGiveaway(_prev: unknown, form: FormData): Promise<Result> {
  const { supabase } = await requireAdmin();
  const id = String(form.get('id') ?? '') || null;
  const num = (k: string) => Number(String(form.get(k) ?? '').replace(',', '.'));
  const text = (k: string) => String(form.get(k) ?? '').trim() || null;

  const values = {
    title: String(form.get('title') ?? '').trim(),
    description: String(form.get('description') ?? '').trim(),
    image_url: text('image_url'),
    product_url: text('product_url'),
    wc_product_id: text('wc_product_id') ? Number(text('wc_product_id')) : null,
    retail_price_ron: num('retail_price_ron'),
    giveaway_price_ron: num('giveaway_price_ron'),
    opens_at: fromLocalInput(String(form.get('opens_at'))),
    closes_at: fromLocalInput(String(form.get('closes_at'))),
  };

  if (!values.title) return { ok: false, message: 'Titlul este obligatoriu.' };
  if (!(values.retail_price_ron > values.giveaway_price_ron)) {
    return { ok: false, message: 'Prețul din giveaway trebuie să fie mai mic decât prețul normal.' };
  }
  if (values.closes_at <= values.opens_at) return { ok: false, message: 'Închiderea trebuie să fie după deschidere.' };

  const query = id
    ? supabase.from('giveaways').update(values).eq('id', id).select('id').single()
    : supabase.from('giveaways').insert(values).select('id').single();
  const { data, error } = await query;
  if (error) return { ok: false, message: error.message };

  refresh(data.id);
  redirect(`/admin/giveaway/${data.id}`);
}

export async function deleteDraft(giveawayId: string) {
  const { supabase } = await requireAdmin();
  await supabase.from('giveaways').delete().eq('id', giveawayId).eq('status', 'draft');
  refresh();
  redirect('/admin');
}

// Opens the giveaway and pushes a notification to everyone who opted in.
export async function publishAndNotify(giveawayId: string, _prev: unknown, form: FormData): Promise<Result> {
  const { supabase } = await requireAdmin();
  const notify = form.get('notify') === 'on';

  const { data, error } = await supabase
    .from('giveaways')
    .update({ status: 'open', ...(notify ? { notified_at: new Date().toISOString() } : {}) })
    .eq('id', giveawayId)
    .in('status', ['draft', 'open'])
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  const g = data as Giveaway;

  let sent = 0;
  if (notify) {
    sent = await pushToEveryone({
      title: 'Giveaway nou!',
      body: `${g.title} la doar ${Number(g.giveaway_price_ron).toFixed(0)} lei. Înscrie-te gratuit acum.`,
      url: `/giveaway/${g.id}`,
    });
  }
  refresh(giveawayId);
  return { ok: true, message: notify ? `Publicat. Notificare trimisă pe ${sent} dispozitive.` : 'Publicat.' };
}

export async function closeEntries(giveawayId: string) {
  const { supabase } = await requireAdmin();
  await supabase.from('giveaways').update({ status: 'closed' }).eq('id', giveawayId).eq('status', 'open');
  refresh(giveawayId);
}

// Draws (or redraws) the winner, makes a WooCommerce coupon if configured and
// tells the winner by email, in the app and by push.
export async function drawWinner(giveawayId: string): Promise<Result> {
  const { supabase } = await requireAdmin();

  // Runs as the admin, so the database checks the role and logs who drew.
  const { data: win, error } = await supabase.rpc('draw_winner', { p_giveaway_id: giveawayId });
  if (error) {
    const known: Record<string, string> = {
      'no eligible entries': 'Nu există participanți eligibili.',
      'giveaway has not been published': 'Giveaway-ul nu a fost publicat.',
    };
    return { ok: false, message: known[error.message] ?? error.message };
  }

  const db = createAdminClient();
  const [{ data: g }, { data: winner }] = await Promise.all([
    db.from('giveaways').select('*').eq('id', giveawayId).single(),
    db.from('profiles').select('id, email, display_name').eq('id', win.user_id).single(),
  ]);
  if (!g || !winner) return { ok: false, message: 'Tragerea s-a făcut, dar câștigătorul nu a fost găsit.' };
  const giveaway = g as Giveaway;

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
    giveaway_id: giveawayId,
    title: 'Ai câștigat!',
    body: `Felicitări! Ai câștigat ${giveaway.title} la ${price}. ${howToBuy}`,
  });

  if (winner.email) {
    const productLink = giveaway.product_url
      ? `<p><a href="${escapeHtml(giveaway.product_url)}" style="display:inline-block;background:#e4002b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Vezi produsul pe lootshop.ro</a></p>`
      : '';
    await sendEmail(
      winner.email,
      `Ai câștigat: ${giveaway.title}`,
      emailLayout(
        'Felicitări, ai câștigat!',
        `<p>Salut ${escapeHtml(winner.display_name ?? '')},</p>
         <p>Ai câștigat giveaway-ul <b>${escapeHtml(giveaway.title)}</b>. Poți cumpăra produsul la doar <b>${price}</b>.</p>
         <p>${coupon ? `Cumpără produsul de pe lootshop.ro și folosește codul <b style="font-family:monospace;font-size:18px">${coupon}</b> la finalizarea comenzii.` : escapeHtml(howToBuy)}</p>
         ${productLink}
         <p>Ne poți răspunde la acest email sau din <a href="${site()}/inbox">Mesaje</a>.</p>`,
      ),
    );
  }

  await pushToUser(winner.id, {
    title: 'Ai câștigat! 🎉',
    body: `${giveaway.title} la ${price}. Apasă pentru detalii.`,
    url: '/inbox',
  });

  refresh(giveawayId);
  return { ok: true, message: `Câștigător: ${winner.display_name ?? winner.email}` };
}

export async function forfeitWin(winId: string, giveawayId: string) {
  const { supabase } = await requireAdmin();
  await supabase.rpc('forfeit_win', { p_win_id: winId });
  refresh(giveawayId);
}

export async function setWinStatus(winId: string, giveawayId: string, status: Exclude<WinStatus, 'forfeited'>) {
  const { supabase } = await requireAdmin();
  await supabase.from('wins').update({ status, updated_at: new Date().toISOString() }).eq('id', winId);
  refresh(giveawayId);
}

export async function saveWinDetails(winId: string, giveawayId: string, _prev: unknown, form: FormData): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from('wins')
    .update({
      coupon_code: String(form.get('coupon_code') ?? '').trim() || null,
      notes: String(form.get('notes') ?? '').trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', winId);
  refresh(giveawayId);
  return error ? { ok: false, message: error.message } : { ok: true, message: 'Salvat.' };
}

// Sends a message to one user: in the app, by push and optionally by email.
export async function sendAdminMessage(userId: string, giveawayId: string | null, body: string, alsoEmail: boolean) {
  const { supabase } = await requireAdmin();
  const text = body.trim().slice(0, 4000);
  if (!text) return { ok: false, error: 'Mesajul este gol.' };

  const { error } = await supabase
    .from('messages')
    .insert({ user_id: userId, from_admin: true, giveaway_id: giveawayId, body: text });
  if (error) return { ok: false, error: error.message };

  if (giveawayId) {
    await supabase
      .from('wins')
      .update({ status: 'contacted', updated_at: new Date().toISOString() })
      .eq('giveaway_id', giveawayId)
      .eq('user_id', userId)
      .eq('status', 'pending');
  }

  await pushToUser(userId, { title: 'Mesaj nou de la Loot Shop', body: text.slice(0, 140), url: '/inbox' });

  if (alsoEmail) {
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single();
    if (profile?.email) {
      await sendEmail(
        profile.email,
        'Mesaj de la Loot Shop',
        emailLayout(
          'Mesaj de la Loot Shop',
          `<p style="white-space:pre-wrap">${escapeHtml(text)}</p><p><a href="${site()}/inbox">Răspunde în aplicație</a> sau direct la acest email.</p>`,
        ),
      );
    }
  }

  revalidatePath(`/admin/messages/${userId}`);
  if (giveawayId) revalidatePath(`/admin/giveaway/${giveawayId}`);
  return { ok: true };
}
