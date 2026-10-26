'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button, Card, cx, Field, Notice } from '@/components/ui';
import { siteUrl } from '@/lib/paths';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'signup' | 'magic';

// Social logins shown on the page; turn each on in Supabase first.
const providers = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? '').split(',').map((p) => p.trim()).filter(Boolean);

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);

  const callbackUrl = () => `${siteUrl()}/login/?next=${encodeURIComponent(next)}`;

  const oauth = async (provider: 'google' | 'facebook') => {
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl() } });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  };

  const submit = async (form: FormData) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    const auth = supabase().auth;
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    try {
      if (mode === 'signin') {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw new Error('Email sau parolă greșită.');
        return; // The login page redirects once the session appears.
      }
      if (mode === 'signup') {
        if (!form.get('terms')) throw new Error('Trebuie să accepți regulamentul și politica de confidențialitate.');
        const { data, error } = await auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl(), data: { full_name: String(form.get('name') ?? '').trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo('Ți-am trimis un email de confirmare. Apasă pe link ca să-ți activezi contul.');
        }
        return;
      }
      const { error } = await auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl() } });
      if (error) throw error;
      setInfo('Ți-am trimis un link de autentificare pe email.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-5">
      {providers.length ? (
        <>
          <div className="grid gap-2">
            {providers.includes('google') ? (
              <Button variant="secondary" onClick={() => oauth('google')} disabled={busy}>
                <GoogleIcon /> Continuă cu Google
              </Button>
            ) : null}
            {providers.includes('facebook') ? (
              <Button variant="secondary" onClick={() => oauth('facebook')} disabled={busy}>
                <FacebookIcon /> Continuă cu Facebook
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold uppercase text-muted">
            <span className="h-px flex-1 bg-border" />
            sau cu email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-2 rounded-xl bg-background p-1 text-sm font-semibold">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cx('rounded-lg py-2', mode === m ? 'bg-surface shadow-sm' : 'text-muted')}>
            {m === 'signin' ? 'Am cont' : 'Cont nou'}
          </button>
        ))}
      </div>

      <form action={submit} className="flex flex-col gap-3">
        {mode === 'signup' ? <Field label="Nume" name="name" autoComplete="name" required /> : null}
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        {mode !== 'magic' ? (
          <Field
            label="Parolă"
            name="password"
            type="password"
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            hint={mode === 'signup' ? 'Minim 8 caractere' : undefined}
          />
        ) : null}
        {mode === 'signup' ? (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="terms" className="mt-1 size-4 accent-[var(--primary)]" />
            <span>
              Accept <Link href="/rules" className="underline" target="_blank">regulamentul oficial</Link> și{' '}
              <Link href="/privacy" className="underline" target="_blank">politica de confidențialitate</Link>.
            </span>
          </label>
        ) : null}

        {error ? <Notice tone="error">{error}</Notice> : null}
        {info ? <Notice tone="success">{info}</Notice> : null}

        <Button type="submit" disabled={busy}>
          {busy ? 'Un moment…' : mode === 'signin' ? 'Intră în cont' : mode === 'signup' ? 'Creează cont' : 'Trimite link'}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === 'magic' ? 'signin' : 'magic')}
        className="text-sm font-semibold text-muted underline">
        {mode === 'magic' ? 'Intră cu parolă' : 'Ai uitat parola? Intră cu un link pe email'}
      </button>
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.3-4.7 3.3-8Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" />
    </svg>
  );
}
