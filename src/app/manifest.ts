import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Loot Shop Giveaway',
    short_name: 'Loot Giveaway',
    description: 'Giveaway zilnic cu produse TCG sigilate la prețuri imposibile.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f6f8',
    theme_color: '#e4002b',
    lang: 'ro',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
