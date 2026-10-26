'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { RequireUser } from '@/components/guards';
import { PushToggle } from '@/components/push-toggle';
import { Button, Card, Check, Field, PageTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { must, useData } from '@/lib/data';
import { formatDateTime } from '@/lib/format';
import { callFunction, supabase } from '@/lib/supabase';
import { useAction } from '@/lib/use-action';

export default function AccountPage() {
  return (
    <RequireUser>
      <Account />
    </RequireUser>
  );
}

function Account() {
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const userId = session!.user.id;
  const save = useAction();
  const danger = useAction();
  const [name, setName] = useState<string | null>(null);
  const [optIn, setOptIn] = useState<boolean | null>(null);

  const { data: entries } = useData(
    async () =>
      must(
        await supabase()
          .from('entries')
          .select('created_at, giveaways(id, title)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
      ) as unknown as { created_at: string; giveaways: { id: string; title: string } | null }[],
    [userId],
  );

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    save.run(async () => {
      const { error } = await supabase()
        .from('profiles')
        .update({
          display_name: (name ?? profile?.display_name ?? '').trim() || null,
          notifications_opt_in: optIn ?? profile?.notifications_opt_in ?? true,
        })
        .eq('id', userId);
      if (error) throw error;
      await refreshProfile();
      return 'Salvat.';
    });
  };

  const signOut = () =>
    danger.run(async () => {
      await supabase().auth.signOut();
      router.replace('/');
    });

  const deleteAccount = () =>
    danger.run(async () => {
      await callFunction('delete-account');
      await supabase().auth.signOut();
      router.replace('/');
    }, 'Sigur vrei să ștergi contul? Toate datele și înscrierile tale vor fi șterse definitiv.');

  return (
    <>
      <PageTitle sub={session!.user.email}>Contul tău</PageTitle>

      <PushToggle />

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Profil</h2>
        <form onSubmit={saveProfile} className="flex flex-col gap-3">
          <Field
            label="Nume afișat"
            value={name ?? profile?.display_name ?? ''}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            hint="Dacă câștigi, afișăm doar prenumele și inițiala."
          />
          <Check
            label="Vreau notificări când începe un giveaway nou."
            checked={optIn ?? profile?.notifications_opt_in ?? true}
            onChange={(e) => setOptIn(e.target.checked)}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary" disabled={save.busy}>
              {save.busy ? 'Se salvează…' : 'Salvează'}
            </Button>
            {save.message ? <span className="text-sm text-success">{save.message}</span> : null}
            {save.error ? <span className="text-sm text-danger">{save.error}</span> : null}
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Înscrierile tale</h2>
        {entries?.length ? (
          <ul className="divide-y divide-border">
            {entries.map((e) =>
              e.giveaways ? (
                <li key={e.giveaways.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/giveaway?id=${e.giveaways.id}`} className="font-semibold hover:underline">
                    {e.giveaways.title}
                  </Link>
                  <span className="shrink-0 text-muted">{formatDateTime(e.created_at)}</span>
                </li>
              ) : null,
            )}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nu te-ai înscris încă la niciun giveaway.</p>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/rules" className="underline">
            Regulament oficial
          </Link>
          <Link href="/privacy" className="underline">
            Politica de confidențialitate
          </Link>
          <a href="https://lootshop.ro" className="underline">
            lootshop.ro
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={signOut} disabled={danger.busy}>
            Ieși din cont
          </Button>
          <Button variant="ghost" className="text-danger" onClick={deleteAccount} disabled={danger.busy}>
            Șterge contul
          </Button>
        </div>
        {danger.error ? <p className="text-sm text-danger">{danger.error}</p> : null}
      </Card>
    </>
  );
}
