import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';

import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Intră în cont' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const next = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/';
  const error = typeof params.error === 'string' ? params.error : null;

  const { user } = await getSession();
  if (user) redirect(next);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-3xl font-black tracking-tight">Intră în cont</h1>
        <p className="text-muted">Ai nevoie de un cont gratuit ca să te înscrii la giveaway-uri.</p>
      </div>
      <LoginForm next={next} initialError={error} />
    </div>
  );
}
