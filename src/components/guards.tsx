'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { isConfigured } from '@/lib/supabase';

export function NotConfigured() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <p className="text-lg font-bold">În curând</p>
      <p className="max-w-sm text-muted">Giveaway-urile Loot Shop pornesc în curând. Revino puțin mai târziu!</p>
    </div>
  );
}

// Sends signed-out visitors to the login page, then back here.
export function RequireUser({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (isConfigured && !loading && !session) {
      const here = pathname + (search.size ? `?${search}` : '');
      router.replace(`/login?next=${encodeURIComponent(here)}`);
    }
  }, [loading, session, pathname, search, router]);

  if (!isConfigured) return <NotConfigured />;
  if (loading || !session) return <Loading />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile, isAdmin } = useAuth();
  return (
    <RequireUser>
      {!profile ? <Loading /> : isAdmin ? children : <p className="text-muted">Pagina este doar pentru administrator.</p>}
    </RequireUser>
  );
}
