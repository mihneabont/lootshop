'use client';

import { Conversation } from '@/components/conversation';
import { RequireUser } from '@/components/guards';
import { PageTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';

export default function InboxPage() {
  return (
    <RequireUser>
      <Inbox />
    </RequireUser>
  );
}

function Inbox() {
  const { session } = useAuth();
  return (
    <>
      <PageTitle sub="Conversația ta cu Loot Shop. Aici te anunțăm dacă ai câștigat.">Mesaje</PageTitle>
      <Conversation userId={session!.user.id} asAdmin={false} />
    </>
  );
}
