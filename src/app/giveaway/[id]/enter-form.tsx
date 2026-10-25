'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import { Notice } from '@/components/ui';

import { enterGiveaway } from './actions';

export function EnterForm({ giveawayId }: { giveawayId: string }) {
  const [state, action] = useActionState(enterGiveaway.bind(null, giveawayId), null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <SubmitButton pendingText="Te înscriem…" className="w-full">
        Înscrie-te gratuit
      </SubmitButton>
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      <p className="text-xs text-muted">
        Prin înscriere accepți regulamentul oficial. Înscrierea nu te obligă la nicio cumpărare.
      </p>
    </form>
  );
}
