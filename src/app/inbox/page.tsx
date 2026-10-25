import type { Metadata } from 'next';

import { Conversation } from '@/components/conversation';
import { PageTitle } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import type { Message } from '@/lib/types';

import { sendToShop } from './actions';

export const metadata: Metadata = { title: 'Mesaje' };

export default async function InboxPage() {
  const { supabase, user } = await requireUser('/inbox');

  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(300);

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('from_admin', true)
    .is('read_at', null);

  return (
    <>
      <PageTitle sub="Conversația ta cu Loot Shop. Aici te anunțăm dacă ai câștigat.">Mesaje</PageTitle>
      <Conversation userId={user.id} asAdmin={false} initial={(data ?? []) as Message[]} send={sendToShop} />
    </>
  );
}
