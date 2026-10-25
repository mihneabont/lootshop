'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export async function sendToShop(body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Trebuie să fii autentificat.' };
  const text = body.trim().slice(0, 4000);
  if (!text) return { ok: false, error: 'Mesajul este gol.' };

  const { error } = await supabase.from('messages').insert({ user_id: user.id, from_admin: false, body: text });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/inbox');
  return { ok: true };
}
