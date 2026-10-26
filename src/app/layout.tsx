import type { Metadata, Viewport } from 'next';

import './globals.css';

import { Shell } from '@/components/shell';
import { withBase } from '@/lib/paths';

export const metadata: Metadata = {
  title: { default: 'Loot Shop Giveaway', template: '%s · Loot Shop Giveaway' },
  description: 'Giveaway zilnic cu produse TCG sigilate la prețuri imposibile. Înscriere gratuită.',
  appleWebApp: { capable: true, title: 'Loot Giveaway', statusBarStyle: 'default' },
  manifest: withBase('/manifest.webmanifest'),
  icons: { icon: withBase('/icons/icon-192.png'), apple: withBase('/icons/apple-touch-icon.png') },
};

export const viewport: Viewport = {
  themeColor: '#e4002b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ro" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
