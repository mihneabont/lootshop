'use client';

import Link from 'next/link';

import { Countdown } from '@/components/countdown';
import { GiveawayCard, PhaseBadge, Prices, ProductImage } from '@/components/giveaway-card';
import { NotConfigured } from '@/components/guards';
import { PushToggle } from '@/components/push-toggle';
import { buttonStyles, Card, Empty, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { must, useData } from '@/lib/data';
import { phaseOf } from '@/lib/format';
import { isConfigured, supabase } from '@/lib/supabase';
import type { Giveaway } from '@/lib/types';

export default function Home() {
  return isConfigured ? <HomeContent /> : <NotConfigured />;
}

function HomeContent() {
  const { session } = useAuth();
  const { data, loading } = useData(
    async () =>
      must(
        await supabase()
          .from('giveaways')
          .select('*')
          .neq('status', 'draft')
          .order('opens_at', { ascending: false })
          .limit(60),
      ) as Giveaway[],
    [],
  );
  if (loading || !data) return <Loading />;

  const live = data.filter((g) => phaseOf(g) === 'open');
  const upcoming = data.filter((g) => phaseOf(g) === 'upcoming').reverse();
  const past = data.filter((g) => ['closed', 'drawn'].includes(phaseOf(g)));
  const featured = live[0];

  return (
    <>
      {featured ? (
        <Card className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <ProductImage giveaway={featured} />
          <div className="flex flex-col justify-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <PhaseBadge giveaway={featured} />
              <span className="text-sm font-semibold text-muted">
                <Countdown to={featured.closes_at} prefix="Se închide în " />
              </span>
            </div>
            <h1 className="text-3xl font-black leading-tight tracking-tight">{featured.title}</h1>
            <Prices giveaway={featured} size="lg" />
            <p className="text-muted">
              Înscriere gratuită. Câștigătorul poate cumpăra produsul la acest preț de pe lootshop.ro.
            </p>
            <Link href={`/giveaway?id=${featured.id}`} className={buttonStyles.primary}>
              {session ? 'Vezi și înscrie-te' : 'Înscrie-te gratuit'}
            </Link>
            <p className="text-sm text-muted">{featured.entry_count} înscriși până acum</p>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col gap-2 p-6">
          <h1 className="text-3xl font-black tracking-tight">Giveaway zilnic Loot Shop</h1>
          <p className="text-muted">
            În fiecare zi, un produs sigilat la un preț imposibil. Înscrierea e gratuită; câștigătorul îl cumpără de pe
            lootshop.ro la prețul din giveaway.
          </p>
        </Card>
      )}

      {session ? <PushToggle compact /> : null}

      {live.length > 1 ? (
        <Section title="Live acum">
          {live.slice(1).map((g) => (
            <GiveawayCard key={g.id} giveaway={g} />
          ))}
        </Section>
      ) : null}

      {upcoming.length ? (
        <Section title="Urmează">
          {upcoming.map((g) => (
            <GiveawayCard key={g.id} giveaway={g} />
          ))}
        </Section>
      ) : null}

      <Section title="Giveaway-uri trecute">
        {past.length ? (
          past.map((g) => <GiveawayCard key={g.id} giveaway={g} />)
        ) : (
          <div className="col-span-full">
            <Empty title="Încă nu există giveaway-uri încheiate" body="Primul câștigător apare aici." />
          </div>
        )}
      </Section>

      <p className="text-center text-xs text-muted">
        Participarea este gratuită. Vezi{' '}
        <Link href="/rules" className="underline">
          regulamentul oficial
        </Link>{' '}
        și{' '}
        <Link href="/privacy" className="underline">
          politica de confidențialitate
        </Link>
        .
      </p>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">{children}</div>
    </section>
  );
}
