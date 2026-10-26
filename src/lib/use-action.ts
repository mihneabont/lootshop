'use client';

import { useCallback, useState } from 'react';

// Runs an async action while tracking busy state and its result message.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<string | void>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const msg = await fn();
      if (msg) setMessage(msg);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, message, run };
}
