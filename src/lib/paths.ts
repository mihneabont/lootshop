// The site may live under a sub-path (e.g. /lootshop on GitHub Pages).
// next/link and the router add it automatically; plain URLs need withBase().
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const withBase = (path: string) => `${basePath}${path}`;

export const siteUrl = () => (typeof window === 'undefined' ? '' : window.location.origin) + basePath;
