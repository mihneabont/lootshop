import type { NextConfig } from 'next';

// Static export for GitHub Pages. NEXT_PUBLIC_BASE_PATH is the repo sub-path
// (e.g. /lootshop); leave it empty when serving from a custom domain.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
