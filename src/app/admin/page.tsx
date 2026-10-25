import type { Metadata } from 'next';
import Link from 'next/link';

import { PhaseBadge } from '@/components/giveaway-card';
import { buttonStyles, Card, Empty, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, formatPrice } from '@/lib/format';
import type { Giveaway } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin' };

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { count: unread }, { count: users }] = await Promise.all([
    supabase.from('giveaways').select('*').order('opens_at', { ascending: false }).limit(100),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('from_admin', false).is('read_at', null),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);
  const giveaways = (data ?? []) as Giveaway[];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle sub={`${users ?? 0} conturi`}>Admin</PageTitle>
        <div className="flex gap-2">
          <Link href="/admin/messages" className={buttonStyles.secondary}>
            Mesaje{unread ? ` (${unread})` : ''}
          </Link>
          <Link href="/admin/new" className={buttonStyles.primary}>
            Giveaway nou
          </Link>
        </div>
      </div>

      {giveaways.length === 0 ? (
        <Empty title="Niciun giveaway încă" body="Creează primul giveaway, publică-l și toți cei cu notificări active vor fi anunțați." />
      ) : (
        <div className="flex flex-col gap-2">
          {giveaways.map((g) => (
            <Link key={g.id} href={`/admin/giveaway/${g.id}`}>
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
