'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function updateProfile(_prev: unknown, form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const displayName = String(form.get('display_name') ?? '').trim().slice(0, 80);
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName || null, notifications_opt_in: form.get('notifications_opt_in') === 'on' })
    .eq('id', user.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/account');
  return { ok: true, message: 'Salvat.' };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

// Deletes the account and, through cascades, all of the user's data.
export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) throw error;
  await supabase.auth.signOut();
  redirect('/?deleted=1');
}
