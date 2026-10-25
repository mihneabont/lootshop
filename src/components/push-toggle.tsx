'use client';

import { useEffect, useState } from 'react';

import { removeSubscription, saveSubscription } from '@/app/push-actions';
import { Button, cx } from '@/components/ui';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        // On iPhone, web push works only once the site is added to the Home Screen.
        setState(ios && !standalone ? 'ios-install' : 'unsupported');
        return;
      }
      if (Notification.permission === 'denied') return setState('denied');
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? 'on' : 'off');
    })().catch(() => setState('unsupported'));
  }, []);

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const res = await saveSubscription(JSON.parse(JSON.stringify(sub)), navigator.userAgent);
      if (!res.ok) throw new Error(res.error);
      setState('on');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removeSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState('off');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') return null;

  const box = cx('flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4', compact && 'p-3');

  if (state === 'ios-install') {
    return (
      <div className={box}>
        <p className="font-bold">Primește notificări pe iPhone</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>
            Apasă butonul <b>Share</b> din Safari (pătratul cu săgeată).
          </li>
          <li>
            Alege <b>Add to Home Screen</b>.
          </li>
          <li>Deschide aplicația de pe ecranul principal și activează notificările de aici.</li>
        </ol>
      </div>
    );
  }
  if (state === 'unsupported') {
    return compact ? null : (
      <div className={box}>
        <p className="text-sm text-muted">Browserul tău nu suportă notificări. Încearcă Chrome sau Safari.</p>
      </div>
    );
  }
  if (state === 'denied') {
    return (
      <div className={box}>
        <p className="font-bold">Notificările sunt blocate</p>
        <p className="text-sm text-muted">Le poți reactiva din setările browserului pentru acest site.</p>
      </div>
    );
  }
  if (state === 'on') {
    return compact ? null : (
      <div className={cx(box, 'sm:flex-row sm:items-center sm:justify-between')}>
        <div>
          <p className="font-bold">Notificări active pe acest dispozitiv</p>
          <p className="text-sm text-muted">Îți spunem când începe un giveaway nou și dacă ai câștigat.</p>
        </div>
        <Button variant="secondary" onClick={disable} disabled={busy}>
          Oprește
        </Button>
      </div>
    );
  }
  return (
    <div className={cx(box, 'sm:flex-row sm:items-center sm:justify-between')}>
      <div>
        <p className="font-bold">Nu rata niciun giveaway</p>
        <p className="text-sm text-muted">Activează notificările și află primul când începe unul nou.</p>
        {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
      </div>
      <Button onClick={enable} disabled={busy}>
        {busy ? 'Se activează…' : 'Activează notificările'}
      </Button>
    </div>
  );
}
