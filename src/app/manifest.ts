import type { MetadataRoute } from 'next';

import { withBase } from '@/lib/paths';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Loot Shop Giveaway',
    short_name: 'Loot Giveaway',
    description: 'Giveaway zilnic cu produse TCG sigilate la prețuri imposibile.',
    id: withBase('/'),
    start_url: withBase('/'),
    scope: withBase('/'),
    display: 'standalone',
    background_color: '#f6f6f8',
    theme_color: '#e4002b',
    lang: 'ro',
    icons: [
      { src: withBase('/icons/icon-192.png'), sizes: '192x192', type: 'image/png' },
      { src: withBase('/icons/icon-512.png'), sizes: '512x512', type: 'image/png' },
      { src: withBase('/icons/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
