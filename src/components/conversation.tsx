'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button, cx } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '@/lib/types';

// One conversation between the shop and a user. `asAdmin` flips which side is
// "me"; `send` is the server action that stores and delivers a message.
export function Conversation({
  userId,
  asAdmin,
  initial,
  send,
}: {
  userId: string;
  asAdmin: boolean;
  initial: Message[];
  send: (body: string, alsoEmail: boolean) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  // Messages that arrived live since the page was rendered.
  const [live, setLive] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [alsoEmail, setAlsoEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const seen = new Set(initial.map((m) => m.id));
    return [...initial, ...live.filter((m) => !seen.has(m.id))];
  }, [initial, live]);
  useEffect(() => bottom.current?.scrollIntoView({ block: 'end' }), [messages.length]);

  // New messages appear live.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${userId}` },
        (payload) => {
          const m = payload.new as Message;
          setLive((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    const res = await send(body, alsoEmail);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? 'Mesajul nu a fost trimis.');
    setDraft('');
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-60 flex-col gap-2 rounded-2xl border border-border bg-surface p-3 sm:p-4">
        {messages.length === 0 ? (
          <p className="m-auto max-w-xs text-center text-muted">
            {asAdmin ? 'Niciun mesaj încă. Scrie primul mesaj.' : 'Aici primești vești de la Loot Shop, inclusiv când câștigi.'}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.from_admin === asAdmin;
            return (
              <div
                key={m.id}
                className={cx(
                  'flex max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-3',
                  mine ? 'self-end bg-primary text-primary-foreground' : 'self-start border border-border bg-background',
                )}>
                {m.title ? <p className="font-bold">{m.title}</p> : null}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cx('text-[11px]', mine ? 'opacity-80' : 'text-muted')}>
                  {m.from_admin && !asAdmin ? 'Loot Shop · ' : ''}
                  {formatDateTime(m.created_at)}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Scrie un mesaj…"
          rows={3}
          maxLength={4000}
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-base focus:border-primary focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3">
          {asAdmin ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={alsoEmail}
                onChange={(e) => setAlsoEmail(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              Trimite și pe email
            </label>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={busy || !draft.trim()}>
            {busy ? 'Se trimite…' : 'Trimite'}
          </Button>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </form>
    </div>
  );
}
