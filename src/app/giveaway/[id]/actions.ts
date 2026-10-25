'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export async function enterGiveaway(giveawayId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/giveaway/${giveawayId}`);

  const { error } = await supabase.from('entries').insert({ giveaway_id: giveawayId, user_id: user.id });
  if (error) {
    if (error.code === '23505') return { ok: true };
    return { ok: false, error: 'Înscrierile pentru acest giveaway nu sunt deschise.' };
  }
  revalidatePath(`/giveaway/${giveawayId}`);
  revalidatePath('/');
  return { ok: true };
}
