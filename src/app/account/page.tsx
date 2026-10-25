import type { Metadata } from 'next';
import Link from 'next/link';

import { PushToggle } from '@/components/push-toggle';
import { SubmitButton } from '@/components/submit-button';
import { Card, PageTitle } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

import { deleteAccount, signOut } from './actions';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Cont' };

export default async function AccountPage() {
  const { supabase, user, profile } = await requireUser('/account');

  const { data: entries } = await supabase
    .from('entries')
    .select('created_at, giveaways(id, title, status, winner_display)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <>
      <PageTitle sub={user.email}>Contul tău</PageTitle>

      <PushToggle />

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Profil</h2>
        <ProfileForm name={profile?.display_name ?? ''} optIn={profile?.notifications_opt_in ?? true} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Înscrierile tale</h2>
        {entries?.length ? (
          <ul className="divide-y divide-border">
            {entries.map((e) => {
              const g = e.giveaways as unknown as { id: string; title: string } | null;
              return g ? (
                <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/giveaway/${g.id}`} className="font-semibold hover:underline">
                    {g.title}
                  </Link>
                  <span className="shrink-0 text-muted">{formatDateTime(e.created_at)}</span>
                </li>
              ) : null;
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nu te-ai înscris încă la niciun giveaway.</p>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/rules" className="underline">Regulament oficial</Link>
          <Link href="/privacy" className="underline">Politica de confidențialitate</Link>
          <a href="https://lootshop.ro" className="underline">lootshop.ro</a>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={signOut}>
            <SubmitButton variant="secondary" pendingText="Ieșire…">
              Ieși din cont
            </SubmitButton>
          </form>
          <form action={deleteAccount}>
            <SubmitButton
              variant="ghost"
              className="text-danger"
              pendingText="Se șterge…"
              confirm="Sigur vrei să ștergi contul? Toate datele și înscrierile tale vor fi șterse definitiv.">
              Șterge contul
            </SubmitButton>
          </form>
        </div>
      </Card>
    </>
  );
}
