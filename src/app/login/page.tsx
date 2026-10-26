'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { NotConfigured } from '@/components/guards';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { isConfigured } from '@/lib/supabase';

import { LoginForm } from './login-form';

export default function LoginPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { session, loading } = useAuth();
  const nextParam = params.get('next') ?? '/';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';
  // Google/Facebook and email links come back here with ?code=…, which the
  // Supabase client exchanges for a session on its own.
  const returning = params.has('code');

  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);

  if (!isConfigured) return <NotConfigured />;
  if (loading || session || returning) return <Loading />;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-3xl font-black tracking-tight">Intră în cont</h1>
        <p className="text-muted">Ai nevoie de un cont gratuit ca să te înscrii la giveaway-uri.</p>
      </div>
      <LoginForm next={next} initialError={params.get('error_description')} />
    </div>
  );
}
