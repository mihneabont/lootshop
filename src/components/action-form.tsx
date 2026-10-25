'use client';

import { useActionState, type ReactNode } from 'react';

type Result = { ok: boolean; message?: string } | null;

// A form bound to a server action that returns { ok, message }, showing the message.
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: Result, form: FormData) => Promise<Result>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className ?? 'flex flex-col gap-3'}>
      {children}
      {state?.message ? (
        <p className={state.ok ? 'text-sm font-semibold text-success' : 'text-sm font-semibold text-danger'}>{state.message}</p>
      ) : null}
    </form>
  );
}
