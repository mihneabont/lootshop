import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Conversation } from '@/components/conversation';
import { PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import type { Message, Profile } from '@/lib/types';

import { sendAdminMessage } from '../../actions';

export default async function AdminConversationPage({ params }: PageProps<'/admin/messages/[userId]'>) {
  const { userId } = await params;
  const { supabase } = await requireAdmin();

  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('messages').select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(300),
  ]);
  if (!profile) notFound();
  const p = profile as Profile;

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('from_admin', false)
    .is('read_at', null);

  return (
    <>
      <Link href="/admin/messages" className="text-sm font-semibold text-muted">
        ← Mesaje
      </Link>
      <PageTitle
        sub={
          p.email ? (
            <a href={`mailto:${p.email}`} className="text-primary underline">
              {p.email}
            </a>
          ) : undefined
        }>
        {p.display_name ?? 'Utilizator'}
      </PageTitle>
      <Conversation
        userId={userId}
        asAdmin
        initial={(data ?? []) as Message[]}
        send={sendAdminMessage.bind(null, userId, null)}
      />
    </>
  );
}
