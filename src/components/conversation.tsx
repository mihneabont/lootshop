'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, cx, Loading } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { callFunction, supabase } from '@/lib/supabase';
import type { Message } from '@/lib/types';

// One conversation between the shop and a user. As admin, messages go through
// the send-message function (push + optional email); users write directly.
export function Conversation({ userId, asAdmin, giveawayId }: { userId: string; asAdmin: boolean; giveawayId?: string }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [alsoEmail, setAlsoEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const client = supabase();
    const { data } = await client
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(300);
    setMessages((data ?? []) as Message[]);
    // Mark the other side's messages as read.
    await client
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('from_admin', !asAdmin)
      .is('read_at', null);
  }, [userId, asAdmin]);

  useEffect(() => {
    const client = supabase();
    const first = setTimeout(load, 0);
    const channel = client
      .channel(`messages:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => {
      clearTimeout(first);
      client.removeChannel(channel);
    };
  }, [userId, load]);

  useEffect(() => bottom.current?.scrollIntoView({ block: 'nearest' }), [messages?.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      if (asAdmin) {
        await callFunction('send-message', { user_id: userId, body, giveaway_id: giveawayId ?? null, also_email: alsoEmail });
      } else {
        const { error: insertError } = await supabase().from('messages').insert({ user_id: userId, from_admin: false, body });
        if (insertError) throw insertError;
      }
      setDraft('');
      await load();
    } catch (err) {
      setError((err as Error).message || 'Mesajul nu a fost trimis.');
    } finally {
      setBusy(false);
    }
  };

  if (!messages) return <Loading />;

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
