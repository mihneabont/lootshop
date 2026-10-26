'use client';

import Link from 'next/link';

import { RequireAdmin } from '@/components/guards';
import { Card, Empty, Loading, PageTitle } from '@/components/ui';
import { must, useData } from '@/lib/data';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Message, Profile } from '@/lib/types';

export default function AdminMessagesPage() {
  return (
    <RequireAdmin>
      <Threads />
    </RequireAdmin>
  );
}

function Threads() {
  const { data } = useData(async () => {
    const client = supabase();
    const messages = must(await client.from('messages').select('*').order('created_at', { ascending: false }).limit(1000)) as Message[];

    // Latest message and unread count per user.
    const threads = new Map<string, { last: Message; unread: number }>();
    for (const m of messages) {
      const t = threads.get(m.user_id) ?? { last: m, unread: 0 };
      if (!m.from_admin && !m.read_at) t.unread++;
      threads.set(m.user_id, t);
    }
    const ids = [...threads.keys()];
    const profiles = ids.length
      ? ((await client.from('profiles').select('id, email, display_name').in('id', ids)).data as Pick<Profile, 'id' | 'email' | 'display_name'>[])
      : [];
    const byId = new Map(profiles.map((p) => [p.id, p]));
    return [...threads.entries()].map(([userId, t]) => ({ userId, ...t, profile: byId.get(userId) }));
  }, []);
  if (!data) return <Loading />;

  return (
    <>
      <Link href="/admin" className="text-sm font-semibold text-muted">
        ← Admin
      </Link>
      <PageTitle sub="Conversațiile cu utilizatorii. Câștigătorilor le poți scrie și din pagina giveaway-ului.">Mesaje</PageTitle>
      {data.length === 0 ? (
        <Empty title="Nicio conversație încă" />
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((t) => (
            <Link key={t.userId} href={`/admin/messages/thread?user=${t.userId}`}>
              <Card className="flex items-center justify-between gap-3 transition hover:border-primary/50">
                <div className="min-w-0">
                  <p className="font-bold">
                    {t.profile?.display_name ?? 'Utilizator'} <span className="font-normal text-muted">{t.profile?.email}</span>
                  </p>
                  <p className="truncate text-sm text-muted">
                    {t.last.from_admin ? 'Tu: ' : ''}
                    {t.last.body}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted">{formatDateTime(t.last.created_at)}</span>
                  {t.unread ? (
                    <span className="rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">{t.unread}</span>
                  ) : null}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
