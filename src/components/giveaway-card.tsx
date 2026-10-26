import Link from 'next/link';

import { Countdown } from '@/components/countdown';
import { Badge, Card } from '@/components/ui';
import { formatDateTime, formatPrice, phaseLabel, phaseOf, type Phase } from '@/lib/format';
import type { Giveaway } from '@/lib/types';

const tones: Record<Phase, 'neutral' | 'live' | 'success' | 'warning'> = {
  draft: 'neutral',
  upcoming: 'warning',
  open: 'live',
  closed: 'neutral',
  drawn: 'success',
};

export function PhaseBadge({ giveaway }: { giveaway: Giveaway }) {
  const phase = phaseOf(giveaway);
  return <Badge tone={tones[phase]}>{phaseLabel[phase]}</Badge>;
}

export function ProductImage({ giveaway, className = '' }: { giveaway: Giveaway; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl bg-background ${className}`}>
      {giveaway.image_url ? (
        // Product photos come from the shop; plain img avoids configuring every host.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={giveaway.image_url} alt={giveaway.title} className="aspect-square w-full object-contain p-3" />
      ) : (
        <div className="grid aspect-square w-full place-items-center text-5xl">🎁</div>
      )}
    </div>
  );
}

export function Prices({ giveaway, size = 'md' }: { giveaway: Giveaway; size?: 'md' | 'lg' }) {
  const off = Math.round((1 - giveaway.giveaway_price_ron / giveaway.retail_price_ron) * 100);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={size === 'lg' ? 'text-4xl font-black text-primary' : 'text-2xl font-black text-primary'}>
        {formatPrice(giveaway.giveaway_price_ron)}
      </span>
      <span className="text-muted line-through">{formatPrice(giveaway.retail_price_ron)}</span>
      <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-bold text-zinc-900">-{off}%</span>
    </div>
  );
}

export function GiveawayCard({ giveaway, href }: { giveaway: Giveaway; href?: string }) {
  const phase = phaseOf(giveaway);
  return (
    <Link href={href ?? `/giveaway?id=${giveaway.id}`} className="group block">
      <Card className="flex h-full flex-col gap-3 transition group-hover:border-primary/50">
        <ProductImage giveaway={giveaway} />
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <PhaseBadge giveaway={giveaway} />
          {phase === 'open' ? <Countdown to={giveaway.closes_at} prefix="Se închide în " /> : null}
          {phase === 'upcoming' ? <span>{formatDateTime(giveaway.opens_at)}</span> : null}
        </div>
        <h3 className="text-lg font-bold leading-snug">{giveaway.title}</h3>
        <Prices giveaway={giveaway} />
        <p className="mt-auto text-sm text-muted">
          {phase === 'drawn' && giveaway.winner_display
            ? `Câștigător: ${giveaway.winner_display}`
            : `${giveaway.entry_count} înscriși`}
        </p>
      </Card>
    </Link>
  );
}
