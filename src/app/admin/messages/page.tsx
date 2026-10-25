import type { Metadata } from 'next';
import Link from 'next/link';

import { Card, Empty, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import type { Message, Profile } from '@/lib/types';

export const metadata: Metadata = { title: 'Mesaje · Admin' };

export default async function AdminMessagesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(1000);
  const messages = (data ?? []) as Message[];

  // Latest message and unread count per user.
  const threads = new Map<string, { last: Message; unread: number }>();
  for (const m of messages) {
    const t = threads.get(m.user_id) ?? { last: m, unread: 0 };
    if (!m.from_admin && !m.read_at) t.unread++;
    threads.set(m.user_id, t);
  }

  const ids = [...threads.keys()];
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, email, display_name').in('id', ids)
    : { data: [] };
  const byId = new Map((profiles as Pick<Profile, 'id' | 'email' | 'display_name'>[]).map((p) => [p.id, p]));

  return (
    <>
      <Link href="/admin" className="text-sm font-semibold text-muted">
        ← Admin
      </Link>
      <PageTitle sub="Conversațiile cu utilizatorii. Câștigătorilor le scrii din pagina giveaway-ului.">Mesaje</PageTitle>
      {threads.size === 0 ? (
        <Empty title="Nicio conversație încă" />
      ) : (
        <div className="flex flex-col gap-2">
          {[...threads.entries()].map(([userId, t]) => {
            const p = byId.get(userId);
            return (
              <Link key={userId} href={`/admin/messages/${userId}`}>
                <Card className="flex items-center justify-between gap-3 transition hover:border-primary/50">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {p?.display_name ?? 'Utilizator'} <span className="font-normal text-muted">{p?.email}</span>
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
            );
          })}
        </div>
      )}
    </>
  );
}
