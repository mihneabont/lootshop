'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Conversation } from '@/components/conversation';
import { PhaseBadge, Prices } from '@/components/giveaway-card';
import { RequireAdmin } from '@/components/guards';
import { Badge, Button, buttonStyles, Card, Check, Empty, Field, Loading, Notice, PageTitle, TextArea } from '@/components/ui';
import { must, useData } from '@/lib/data';
import { formatDateTime, phaseOf } from '@/lib/format';
import { callFunction, supabase } from '@/lib/supabase';
import type { Giveaway, Profile, Win } from '@/lib/types';
import { useAction } from '@/lib/use-action';

type Draw = { id: string; drawn_at: string; eligible_count: number; random_value: string; winning_index: number };

const winLabels: Record<Win['status'], string> = {
  pending: 'Neanunțat personal',
  contacted: 'Contactat',
  claimed: 'A cumpărat',
  forfeited: 'Renunțat',
};

export default function ManageGiveawayPage() {
  return (
    <RequireAdmin>
      <Manage />
    </RequireAdmin>
  );
}

function Manage() {
  const id = useSearchParams().get('id') ?? '';
  const router = useRouter();
  const action = useAction();
  const [notify, setNotify] = useState<boolean | null>(null);

  const { data, loading, reload } = useData(async () => {
    const client = supabase();
    const [g, wins, draws] = await Promise.all([
      client.from('giveaways').select('*').eq('id', id).maybeSingle(),
      client.from('wins').select('*').eq('giveaway_id', id).order('created_at', { ascending: false }),
      client.from('draws').select('*').eq('giveaway_id', id).order('drawn_at', { ascending: false }),
    ]);
    const giveaway = must(g) as Giveaway | null;
    const allWins = (must(wins) ?? []) as Win[];
    const activeWin = allWins.find((w) => w.status !== 'forfeited') ?? null;
    const winner = activeWin?.user_id
      ? ((await client.from('profiles').select('*').eq('id', activeWin.user_id).maybeSingle()).data as Profile | null)
      : null;
    return { giveaway, wins: allWins, activeWin, winner, draws: (must(draws) ?? []) as Draw[] };
  }, [id]);

  if (loading) return <Loading />;
  if (!data?.giveaway) return <Empty title="Giveaway inexistent" />;
  const { giveaway, wins, activeWin, winner, draws } = data;
  const phase = phaseOf(giveaway);
  const db = () => supabase();

  const publish = () =>
    action.run(async () => {
      const send = notify ?? !giveaway.notified_at;
      const res = await callFunction<{ sent: number }>('notify-giveaway', { giveaway_id: id, notify: send });
      await reload();
      return send ? `Publicat. Notificare trimisă pe ${res.sent} dispozitive.` : 'Publicat.';
    });

  const close = () =>
    action.run(async () => {
      must(await db().from('giveaways').update({ status: 'closed' }).eq('id', id).eq('status', 'open'));
      await reload();
    }, 'Închizi înscrierile acum?');

  const draw = () =>
    action.run(async () => {
      const res = await callFunction<{ winner_name: string }>('draw-winner', { giveaway_id: id });
      await reload();
      return `Câștigător: ${res.winner_name}`;
    }, 'Extragi câștigătorul acum? Rezultatul este final și câștigătorul este anunțat imediat.');

  const deleteDraft = () =>
    action.run(async () => {
      must(await db().from('giveaways').delete().eq('id', id).eq('status', 'draft'));
      router.replace('/admin');
    }, 'Ștergi ciorna?');

  const setWinStatus = (status: Win['status']) =>
    action.run(async () => {
      if (status === 'forfeited') must(await db().rpc('forfeit_win', { p_win_id: activeWin!.id }));
      else must(await db().from('wins').update({ status, updated_at: new Date().toISOString() }).eq('id', activeWin!.id));
      await reload();
    }, status === 'forfeited' ? 'Câștigătorul pierde premiul și poți extrage altcineva. Continui?' : undefined);

  const saveWin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    action.run(async () => {
      must(
        await db()
          .from('wins')
          .update({
            coupon_code: String(form.get('coupon_code') ?? '').trim() || null,
            notes: String(form.get('notes') ?? '').trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeWin!.id),
      );
      await reload();
      return 'Salvat.';
    });
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-sm font-semibold text-muted">
          ← Admin
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <PhaseBadge giveaway={giveaway} />
          <span className="text-sm text-muted">
            {formatDateTime(giveaway.opens_at)} → {formatDateTime(giveaway.closes_at)}
          </span>
        </div>
        <PageTitle>{giveaway.title}</PageTitle>
        <Prices giveaway={giveaway} />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Înscriși" value={giveaway.entry_count} />
        <Stat label="Notificare" value={giveaway.notified_at ? formatDateTime(giveaway.notified_at) : 'Nu'} />
        <Stat label="Câștigător" value={giveaway.winner_display ?? '–'} />
      </div>

      {action.message ? <Notice tone="success">{action.message}</Notice> : null}
      {action.error ? <Notice tone="error">{action.error}</Notice> : null}

      {giveaway.status === 'draft' || giveaway.status === 'open' ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{giveaway.status === 'draft' ? '1. Publică' : 'Publicat'}</h2>
          <Check
            label="Trimite notificare tuturor celor cu notificări active"
            checked={notify ?? !giveaway.notified_at}
            onChange={(e) => setNotify(e.target.checked)}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={publish} disabled={action.busy}>
              {giveaway.status === 'draft' ? 'Publică' : 'Retrimite notificarea'}
            </Button>
            <Link href={`/admin/edit?id=${id}`} className={buttonStyles.secondary}>
              Editează
            </Link>
            {giveaway.status === 'draft' ? (
              <Button variant="ghost" className="text-danger" onClick={deleteDraft} disabled={action.busy}>
                Șterge ciorna
              </Button>
            ) : null}
          </div>
          {giveaway.status === 'open' ? (
            <p className="text-sm text-muted">
              {phase === 'upcoming'
                ? 'Vizibil pe site; înscrierile pornesc la ora de deschidere.'
                : phase === 'open'
                  ? 'Înscrierile sunt deschise.'
                  : 'Timpul de înscriere a expirat. Poți extrage câștigătorul.'}
            </p>
          ) : null}
        </Card>
      ) : null}

      {giveaway.status !== 'draft' && !activeWin ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">2. Extrage câștigătorul</h2>
          <p className="text-sm text-muted">
            Se alege aleatoriu un participant ({giveaway.entry_count} înscriși
            {wins.length ? `, minus ${wins.length} care au renunțat` : ''}). Câștigătorul primește email, mesaj în aplicație și
            notificare{giveaway.wc_product_id ? ', plus un cupon WooCommerce unic' : ''}.
          </p>
          <div className="flex flex-wrap gap-2">
            {phase === 'open' ? (
              <Button variant="secondary" onClick={close} disabled={action.busy}>
                Închide înscrierile acum
              </Button>
            ) : null}
            <Button onClick={draw} disabled={action.busy || phase === 'open' || phase === 'upcoming'}>
              {action.busy ? 'Un moment…' : phase === 'open' || phase === 'upcoming' ? 'Disponibil după închiderea înscrierilor' : 'Extrage câștigătorul'}
            </Button>
          </div>
        </Card>
      ) : null}

      {activeWin && winner ? (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">3. Câștigător</h2>
            <Badge tone={activeWin.status === 'claimed' ? 'success' : 'warning'}>{winLabels[activeWin.status]}</Badge>
          </div>
          <dl className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted">Nume</dt>
            <dd className="font-semibold">{winner.display_name ?? '–'}</dd>
            <dt className="text-muted">Email</dt>
            <dd>
              {winner.email ? (
                <a
                  href={`mailto:${winner.email}?subject=${encodeURIComponent(`Ai câștigat: ${giveaway.title}`)}`}
                  className="font-semibold text-primary underline">
                  {winner.email}
                </a>
              ) : (
                '–'
              )}
            </dd>
            <dt className="text-muted">Extras</dt>
            <dd>{formatDateTime(activeWin.created_at)}</dd>
          </dl>

          <form onSubmit={saveWin} className="flex flex-col gap-3">
            <Field
              label="Cod cupon lootshop.ro"
              name="coupon_code"
              defaultValue={activeWin.coupon_code ?? ''}
              hint="Creat automat dacă WooCommerce e conectat; altfel îl creezi în WooCommerce și îl lipești aici."
            />
            <TextArea label="Notițe interne" name="notes" defaultValue={activeWin.notes ?? ''} className="min-h-20" />
            <Button type="submit" variant="secondary" disabled={action.busy}>
              Salvează
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {activeWin.status !== 'claimed' ? (
              <Button onClick={() => setWinStatus('claimed')} disabled={action.busy}>
                Marchează: a cumpărat
              </Button>
            ) : null}
            <Button variant="ghost" className="text-danger" onClick={() => setWinStatus('forfeited')} disabled={action.busy}>
              A renunțat → extrage din nou
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-bold">Mesaje cu câștigătorul</h3>
            <Conversation userId={winner.id} asAdmin giveawayId={id} />
          </div>
        </Card>
      ) : null}

      {draws.length ? (
        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Jurnal extrageri</h2>
          <p className="text-sm text-muted">Dovada fiecărei extrageri, dacă cineva o contestă.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 pr-3">Data</th>
                  <th className="py-1 pr-3">Eligibili</th>
                  <th className="py-1 pr-3">Valoare aleatorie</th>
                  <th className="py-1">Poziție</th>
                </tr>
              </thead>
              <tbody>
                {draws.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="py-1 pr-3">{formatDateTime(d.drawn_at)}</td>
                    <td className="py-1 pr-3">{d.eligible_count}</td>
                    <td className="py-1 pr-3 font-mono">{d.random_value}</td>
                    <td className="py-1">{d.winning_index}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="flex flex-col gap-1 p-3 sm:p-4">
      <span className="text-xs text-muted sm:text-sm">{label}</span>
      <span className="text-sm font-extrabold sm:text-xl">{value}</span>
    </Card>
  );
}
