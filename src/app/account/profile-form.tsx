'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import { Field } from '@/components/ui';

import { updateProfile } from './actions';

export function ProfileForm({ name, optIn }: { name: string; optIn: boolean }) {
  const [state, action] = useActionState(updateProfile, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Nume afișat" name="display_name" defaultValue={name} hint="Dacă câștigi, afișăm doar prenumele și inițiala." />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="notifications_opt_in" defaultChecked={optIn} className="mt-1 size-4 accent-[var(--primary)]" />
        <span>Vreau notificări când începe un giveaway nou.</span>
      </label>
      <div className="flex items-center gap-3">
        <SubmitButton variant="secondary" pendingText="Se salvează…">
          Salvează
        </SubmitButton>
        {state ? <span className={state.ok ? 'text-sm text-success' : 'text-sm text-danger'}>{state.message}</span> : null}
      </div>
    </form>
  );
}
