'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Countdown } from '@/components/countdown';
import { PhaseBadge, Prices, ProductImage } from '@/components/giveaway-card';
import { NotConfigured } from '@/components/guards';
import { PushToggle } from '@/components/push-toggle';
import { Button, buttonStyles, Card, Empty, Loading, Notice } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { must, useData } from '@/lib/data';
import { formatDateTime, phaseOf } from '@/lib/format';
import { isConfigured, supabase } from '@/lib/supabase';
import type { Giveaway, Win } from '@/lib/types';
import { useAction } from '@/lib/use-action';

export default function GiveawayPage() {
  const id = useSearchParams().get('id');
  if (!isConfigured) return <NotConfigured />;
  if (!id) return <Empty title="Giveaway inexistent" />;
  return <GiveawayDetail id={id} />;
}

function GiveawayDetail({ id }: { id: string }) {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id;
  const enter = useAction();

  const { data, loading, reload } = useData(async () => {
    const client = supabase();
    const giveaway = must(await client.from('giveaways').select('*').eq('id', id).maybeSingle()) as Giveaway | null;
    if (!giveaway || !userId) return { giveaway, entered: false, win: null as Win | null };
    const [entry, win] = await Promise.all([
      client.from('entries').select('created_at').eq('giveaway_id', id).eq('user_id', userId).maybeSingle(),
      client.from('wins').select('*').eq('giveaway_id', id).eq('user_id', userId).neq('status', 'forfeited').maybeSingle(),
    ]);
    return { giveaway, entered: !!entry.data, win: win.data as Win | null };
  }, [id, userId]);

  if (loading || authLoading || !data) return <Loading />;
  const { giveaway, entered, win } = data;
  if (!giveaway) return <Empty title="Giveaway inexistent" body="Poate a fost șters sau linkul este greșit." />;
  const phase = phaseOf(giveaway);

  const doEnter = () =>
    enter.run(async () => {
      const { error } = await supabase().from('entries').insert({ giveaway_id: id, user_id: userId });
      if (error && error.code !== '23505') throw new Error('Înscrierile pentru acest giveaway nu sunt deschise.');
      await reload();
    });

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
              <b>Ai câștigat!</b> Îți scriem pe email și în{' '}
              <Link href="/inbox" className="underline">
                Mesaje
              </Link>{' '}
              cum cumperi produsul la prețul din giveaway.
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
            ) : session ? (
              <div className="flex flex-col gap-2">
                <Button onClick={doEnter} disabled={enter.busy} className="w-full">
                  {enter.busy ? 'Te înscriem…' : 'Înscrie-te gratuit'}
                </Button>
                {enter.error ? <Notice tone="error">{enter.error}</Notice> : null}
                <p className="text-xs text-muted">
                  Prin înscriere accepți regulamentul oficial. Înscrierea nu te obligă la nicio cumpărare.
                </p>
              </div>
            ) : (
              <>
                <Link href={`/login?next=${encodeURIComponent(`/giveaway?id=${id}`)}`} className={buttonStyles.primary}>
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

        {session && phase !== 'drawn' ? <PushToggle compact /> : null}

        {giveaway.description ? <p className="whitespace-pre-line text-muted">{giveaway.description}</p> : null}
        {giveaway.product_url ? (
          <a href={giveaway.product_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline">
            Vezi produsul pe lootshop.ro
          </a>
        ) : null}
        <p className="text-xs text-muted">
          Participarea este gratuită și nu necesită nicio achiziție.{' '}
          <Link href="/rules" className="underline">
            Regulament oficial
          </Link>
        </p>
      </div>
    </div>
  );
}
