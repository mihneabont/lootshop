'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cx } from '@/components/ui';

type Item = { href: string; label: string; icon: React.ReactNode };

const icons = {
  gift: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6" aria-hidden>
      <path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7Zm0 0h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  ),
};

export function Nav({ signedIn, isAdmin, unread }: { signedIn: boolean; isAdmin: boolean; unread: number }) {
  const pathname = usePathname();
  const items: Item[] = [
    { href: '/', label: 'Giveaway-uri', icon: icons.gift },
    ...(signedIn ? [{ href: '/inbox', label: 'Mesaje', icon: icons.chat }] : []),
    { href: signedIn ? '/account' : '/login', label: signedIn ? 'Cont' : 'Intră în cont', icon: icons.user },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: icons.shield }] : []),
  ];
  const active = (href: string) => (href === '/' ? pathname === '/' || pathname.startsWith('/giveaway') : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">L</span>
            <span>
              Loot Shop <span className="text-primary">Giveaway</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'relative rounded-lg px-3 py-2 text-sm font-semibold',
                  active(item.href) ? 'bg-background text-primary' : 'text-muted hover:text-foreground',
                )}>
                {item.label}
                {item.href === '/inbox' && unread > 0 ? <Dot count={unread} /> : null}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold',
                active(item.href) ? 'text-primary' : 'text-muted',
              )}>
              {item.icon}
              {item.label}
              {item.href === '/inbox' && unread > 0 ? <Dot count={unread} /> : null}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

function Dot({ count }: { count: number }) {
  return (
    <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground sm:-right-1 sm:-top-1">
      {count > 9 ? '9+' : count}
    </span>
  );
}
