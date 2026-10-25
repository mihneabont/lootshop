import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionForm } from '@/components/action-form';
import { Conversation } from '@/components/conversation';
import { PhaseBadge, Prices } from '@/components/giveaway-card';
import { SubmitButton } from '@/components/submit-button';
import { Badge, buttonStyles, Card, Field, PageTitle, TextArea } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, phaseOf } from '@/lib/format';
import type { Giveaway, Message, Profile, Win } from '@/lib/types';

import {
  closeEntries,
  deleteDraft,
  drawWinner,
  forfeitWin,
  publishAndNotify,
  saveWinDetails,
  sendAdminMessage,
  setWinStatus,
} from '../../actions';

const winLabels: Record<Win['status'], string> = {
  pending: 'Neanunțat personal',
  contacted: 'Contactat',
  claimed: 'A cumpărat',
  forfeited: 'Renunțat',
};

export default async function ManageGiveawayPage({ params }: PageProps<'/admin/giveaway/[id]'>) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const [{ data: g }, { data: winsData }, { data: drawsData }] = await Promise.all([
    supabase.from('giveaways').select('*').eq('id', id).maybeSingle(),
    supabase.from('wins').select('*').eq('giveaway_id', id).order('created_at', { ascending: false }),
    supabase.from('draws').select('*').eq('giveaway_id', id).order('drawn_at', { ascending: false }),
  ]);
  if (!g) notFound();
  const giveaway = g as Giveaway;
  const phase = phaseOf(giveaway);
  const wins = (winsData ?? []) as Win[];
  const activeWin = wins.find((w) => w.status !== 'forfeited') ?? null;

  let winner: Profile | null = null;
  let messages: Message[] = [];
  if (activeWin?.user_id) {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', activeWin.user_id).single(),
      supabase.from('messages').select('*').eq('user_id', activeWin.user_id).order('created_at', { ascending: true }).limit(200),
    ]);
    winner = p as Profile;
    messages = (m ?? []) as Message[];
  }

  const send = sendAdminMessage.bind(null, activeWin?.user_id ?? '', id);

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
        <Stat label="Notificare trimisă" value={giveaway.notified_at ? formatDateTime(giveaway.notified_at) : 'Nu'} />
        <Stat label="Câștigător" value={giveaway.winner_display ?? '–'} />
      </div>

      {/* Step 1: publish */}
      {giveaway.status === 'draft' || giveaway.status === 'open' ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{giveaway.status === 'draft' ? '1. Publică' : 'Publicat'}</h2>
          <ActionForm action={publishAndNotify.bind(null, id)} className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="notify" defaultChecked={!giveaway.notified_at} className="size-4 accent-[var(--primary)]" />
              Trimite notificare tuturor celor cu notificări active
            </label>
            <div className="flex flex-wrap gap-2">
              <SubmitButton pendingText="Se publică…">
                {giveaway.status === 'draft' ? 'Publică' : 'Retrimite notificarea'}
              </SubmitButton>
              <Link href={`/admin/giveaway/${id}/edit`} className={buttonStyles.secondary}>
                Editează
              </Link>
            </div>
          </ActionForm>
          {giveaway.status === 'draft' ? (
            <form action={deleteDraft.bind(null, id)}>
              <SubmitButton variant="ghost" className="text-danger" confirm="Ștergi ciorna?">
                Șterge ciorna
              </SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-muted">
              {phase === 'upcoming'
                ? 'Vizibil pe site; înscrierile pornesc la ora de deschidere.'
                : phase === 'open'
                  ? 'Înscrierile sunt deschise.'
                  : 'Timpul de înscriere a expirat. Poți extrage câștigătorul.'}
            </p>
          )}
        </Card>
      ) : null}

      {/* Step 2: draw */}
      {giveaway.status !== 'draft' && !activeWin ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">2. Extrage câștigătorul</h2>
          <p className="text-sm text-muted">
            Se alege aleatoriu un participant ({giveaway.entry_count} înscriși
            {wins.length ? `, minus ${wins.length} care au renunțat` : ''}). Câștigătorul primește email, mesaj în aplicație și
            notificare{giveaway.wc_product_id ? ', plus un cupon WooCommerce unic' : ''}.
          </p>
          {phase === 'open' ? (
            <form action={closeEntries.bind(null, id)}>
              <SubmitButton variant="secondary" confirm="Închizi înscrierile acum?">
                Închide înscrierile acum
              </SubmitButton>
            </form>
          ) : null}
          <ActionForm action={drawWinner.bind(null, id)}>
            <SubmitButton
              pendingText="Se extrage…"
              disabled={phase === 'open' || phase === 'upcoming'}
              confirm="Extragi câștigătorul acum? Rezultatul este final și câștigătorul este anunțat imediat.">
              {phase === 'open' || phase === 'upcoming' ? 'Disponibil după închiderea înscrierilor' : 'Extrage câștigătorul'}
            </SubmitButton>
          </ActionForm>
        </Card>
      ) : null}

      {/* Step 3: contact the winner */}
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
                <a href={`mailto:${winner.email}?subject=${encodeURIComponent(`Ai câștigat: ${giveaway.title}`)}`} className="font-semibold text-primary underline">
                  {winner.email}
                </a>
              ) : (
                '–'
              )}
            </dd>
            <dt className="text-muted">Extras</dt>
            <dd>{formatDateTime(activeWin.created_at)}</dd>
          </dl>

          <ActionForm action={saveWinDetails.bind(null, activeWin.id, id)} className="flex flex-col gap-3">
            <Field
              label="Cod cupon lootshop.ro"
              name="coupon_code"
              defaultValue={activeWin.coupon_code ?? ''}
              hint="Creat automat dacă WooCommerce e conectat; altfel îl poți crea în WooCommerce și îl lipești aici."
            />
            <TextArea label="Notițe interne" name="notes" defaultValue={activeWin.notes ?? ''} className="min-h-20" />
            <SubmitButton variant="secondary" pendingText="Se salvează…">
              Salvează
            </SubmitButton>
          </ActionForm>

          <div className="flex flex-wrap gap-2">
            {activeWin.status !== 'claimed' ? (
              <form action={setWinStatus.bind(null, activeWin.id, id, 'claimed')}>
                <SubmitButton>Marchează: a cumpărat</SubmitButton>
              </form>
            ) : null}
            <form action={forfeitWin.bind(null, activeWin.id, id)}>
              <SubmitButton
                variant="ghost"
                className="text-danger"
                confirm="Câștigătorul pierde premiul și poți extrage altcineva. Continui?">
                A renunțat → extrage din nou
              </SubmitButton>
            </form>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-bold">Mesaje cu câștigătorul</h3>
            <Conversation userId={winner.id} asAdmin initial={messages} send={send} />
          </div>
        </Card>
      ) : null}

      {drawsData?.length ? (
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
                {drawsData.map((d) => (
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
