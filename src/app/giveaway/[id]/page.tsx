import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Countdown } from '@/components/countdown';
import { PhaseBadge, Prices, ProductImage } from '@/components/giveaway-card';
import { PushToggle } from '@/components/push-toggle';
import { buttonStyles, Card, Notice } from '@/components/ui';
import { getSession } from '@/lib/auth';
import { formatDateTime, phaseOf } from '@/lib/format';
import type { Giveaway, Win } from '@/lib/types';

import { EnterForm } from './enter-form';

export async function generateMetadata({ params }: PageProps<'/giveaway/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await getSession();
  const { data } = await supabase.from('giveaways').select('title').eq('id', id).maybeSingle();
  return { title: data?.title ?? 'Giveaway' };
}

export default async function GiveawayPage({ params }: PageProps<'/giveaway/[id]'>) {
  const { id } = await params;
  const { supabase, user } = await getSession();

  const { data } = await supabase.from('giveaways').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const giveaway = data as Giveaway;
  const phase = phaseOf(giveaway);

  let entered = false;
  let win: Win | null = null;
  if (user) {
    const [{ data: entry }, { data: myWin }] = await Promise.all([
      supabase.from('entries').select('created_at').eq('giveaway_id', id).eq('user_id', user.id).maybeSingle(),
      supabase.from('wins').select('*').eq('giveaway_id', id).eq('user_id', user.id).neq('status', 'forfeited').maybeSingle(),
    ]);
    entered = !!entry;
    win = myWin as Win | null;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <ProductImage giveaway={giveaway} className="border border-border bg-surface" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
          <PhaseBadge giveaway={giveaway} />
          {phase === 'open' ? <Countdown to={giveaway.closes_at} prefix="Se închide în " /> : null}
          {phase === 'upcoming' ? <span>Începe {formatDateTime(giveaway.opens_at)}</span> : null}
        </div>
        <h1 className="text-3xl font-black leading-tight tracking-tight">{giveaway.title}</h1>
        <Prices giveaway={giveaway} size="lg" />

        <Card className="flex flex-col gap-3">
          {win ? (
            <Notice tone="success">
              <b>Ai câștigat!</b> Îți scriem pe email și în <Link href="/inbox" className="underline">Mesaje</Link> cum
              cumperi produsul la prețul din giveaway.
              {win.coupon_code ? (
                <>
                  {' '}
                  Codul tău pentru lootshop.ro: <b className="font-mono">{win.coupon_code}</b>
                </>
              ) : null}
            </Notice>
          ) : phase === 'open' ? (
            entered ? (
              <Notice tone="success">
                <b>Ești înscris.</b> Te anunțăm prin notificare și email dacă ai câștigat.
              </Notice>
            ) : user ? (
              <EnterForm giveawayId={giveaway.id} />
            ) : (
              <>
                <Link href={`/login?next=/giveaway/${giveaway.id}`} className={buttonStyles.primary}>
                  Intră în cont ca să te înscrii
                </Link>
                <p className="text-xs text-muted">Înscrierea este gratuită.</p>
              </>
            )
          ) : phase === 'upcoming' ? (
            <p>Înscrierile încep {formatDateTime(giveaway.opens_at)}. Activează notificările ca să afli imediat.</p>
          ) : phase === 'drawn' ? (
            <p>
              Câștigător: <b>{giveaway.winner_display}</b>
              {entered ? '. Nu ai câștigat de data asta, mult noroc data viitoare!' : ''}
            </p>
          ) : (
            <p>Înscrierile s-au închis. Câștigătorul va fi anunțat în curând.{entered ? ' Ești înscris.' : ''}</p>
          )}
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted">Înscriși</dt>
            <dd className="text-right font-semibold">{giveaway.entry_count}</dd>
            <dt className="text-muted">Se închide</dt>
            <dd className="text-right font-semibold">{formatDateTime(giveaway.closes_at)}</dd>
          </dl>
        </Card>

        {user && phase !== 'drawn' ? <PushToggle compact /> : null}

        {giveaway.description ? <p className="whitespace-pre-line text-muted">{giveaway.description}</p> : null}
        {giveaway.product_url ? (
          <a href={giveaway.product_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline">
            Vezi produsul pe lootshop.ro
          </a>
        ) : null}
        <p className="text-xs text-muted">
          Participarea este gratuită și nu necesită nicio achiziție. <Link href="/rules" className="underline">Regulament oficial</Link>
        </p>
      </div>
    </div>
  );
}
