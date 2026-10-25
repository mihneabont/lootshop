import type { Metadata, Viewport } from 'next';

import './globals.css';

import { Nav } from '@/components/nav';
import { ServiceWorker } from '@/components/service-worker';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: { default: 'Loot Shop Giveaway', template: '%s · Loot Shop Giveaway' },
  description: 'Giveaway zilnic cu produse TCG sigilate la prețuri imposibile. Înscriere gratuită.',
  appleWebApp: { capable: true, title: 'Loot Giveaway', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#e4002b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const { supabase, user, profile } = await getSession();
  let unread = 0;
  if (user) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('from_admin', true)
      .is('read_at', null);
    unread = count ?? 0;
  }

  return (
    <html lang="ro" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <Nav signedIn={!!user} isAdmin={profile?.role === 'admin'} unread={unread} />
        <main className="pb-safe mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pt-6 sm:pb-12">{children}</main>
        <ServiceWorker />
      </body>
    </html>
  );
}
