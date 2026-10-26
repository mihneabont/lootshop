'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';

import { Nav } from '@/components/nav';
import { Loading } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { withBase } from '@/lib/paths';
import { supabase } from '@/lib/supabase';

export function Shell({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(withBase('/sw.js'), { scope: withBase('/'), updateViaCache: 'none' })
        .catch(() => {});
    }
  }, []);

  return (
    <AuthProvider>
      <NavWithUnread />
      <main className="pb-safe mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pt-6 sm:pb-12">
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </main>
    </AuthProvider>
  );
}

function NavWithUnread() {
  const { session, isAdmin } = useAuth();
  const [unread, setUnread] = useState(0);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    const client = supabase();
    const load = async () => {
      const { count } = await client
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('from_admin', true)
        .is('read_at', null);
      setUnread(count ?? 0);
    };
    load();
    const channel = client
      .channel(`unread:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [userId]);

  return <Nav signedIn={!!session} isAdmin={isAdmin} unread={userId ? unread : 0} />;
}
