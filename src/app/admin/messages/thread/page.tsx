'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Conversation } from '@/components/conversation';
import { RequireAdmin } from '@/components/guards';
import { Empty, Loading, PageTitle } from '@/components/ui';
import { useData } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export default function AdminThreadPage() {
  return (
    <RequireAdmin>
      <Thread />
    </RequireAdmin>
  );
}

function Thread() {
  const userId = useSearchParams().get('user') ?? '';
  const { data, loading } = useData(
    async () => (await supabase().from('profiles').select('*').eq('id', userId).maybeSingle()).data as Profile | null,
    [userId],
  );
  if (loading) return <Loading />;
  if (!data) return <Empty title="Utilizator inexistent" />;

  return (
    <>
      <Link href="/admin/messages" className="text-sm font-semibold text-muted">
        ← Mesaje
      </Link>
      <PageTitle
        sub={
          data.email ? (
            <a href={`mailto:${data.email}`} className="text-primary underline">
              {data.email}
            </a>
          ) : undefined
        }>
        {data.display_name ?? 'Utilizator'}
      </PageTitle>
      <Conversation userId={userId} asAdmin />
    </>
  );
}
