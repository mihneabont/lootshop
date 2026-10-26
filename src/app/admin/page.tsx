'use client';

import Link from 'next/link';

import { PhaseBadge } from '@/components/giveaway-card';
import { RequireAdmin } from '@/components/guards';
import { buttonStyles, Card, Empty, Loading, PageTitle } from '@/components/ui';
import { must, useData } from '@/lib/data';
import { formatDateTime, formatPrice } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Giveaway } from '@/lib/types';

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminHome />
    </RequireAdmin>
  );
}

function AdminHome() {
  const { data } = useData(async () => {
    const client = supabase();
    const [giveaways, unread, users] = await Promise.all([
      client.from('giveaways').select('*').order('opens_at', { ascending: false }).limit(100),
      client.from('messages').select('id', { count: 'exact', head: true }).eq('from_admin', false).is('read_at', null),
      client.from('profiles').select('id', { count: 'exact', head: true }),
    ]);
    return { giveaways: must(giveaways) as Giveaway[], unread: unread.count ?? 0, users: users.count ?? 0 };
  }, []);
  if (!data) return <Loading />;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle sub={`${data.users} conturi`}>Admin</PageTitle>
        <div className="flex gap-2">
          <Link href="/admin/messages" className={buttonStyles.secondary}>
            Mesaje{data.unread ? ` (${data.unread})` : ''}
          </Link>
          <Link href="/admin/new" className={buttonStyles.primary}>
            Giveaway nou
          </Link>
        </div>
      </div>

      {data.giveaways.length === 0 ? (
        <Empty title="Niciun giveaway încă" body="Creează primul giveaway, publică-l și toți cei cu notificări active vor fi anunțați." />
      ) : (
        <div className="flex flex-col gap-2">
          {data.giveaways.map((g) => (
            <Link key={g.id} href={`/admin/giveaway?id=${g.id}`}>
              <Card className="flex flex-col gap-1 transition hover:border-primary/50 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <PhaseBadge giveaway={g} />
                    <span className="text-sm text-muted">{formatDateTime(g.opens_at)}</span>
                  </div>
                  <span className="font-bold">{g.title}</span>
                </div>
                <div className="flex gap-4 text-sm text-muted">
                  <span>{formatPrice(g.giveaway_price_ron)}</span>
                  <span>{g.entry_count} înscriși</span>
                  {g.winner_display ? <span className="text-success">{g.winner_display}</span> : null}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
