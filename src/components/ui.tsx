import type { ComponentProps, ReactNode } from 'react';

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const buttonBase =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

export const buttonStyles = {
  primary: `${buttonBase} bg-primary text-primary-foreground hover:brightness-110`,
  secondary: `${buttonBase} border border-border bg-surface text-foreground hover:bg-background`,
  danger: `${buttonBase} bg-danger text-white hover:brightness-110`,
  ghost: `${buttonBase} text-foreground hover:bg-surface`,
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof buttonStyles }) {
  return <button {...props} className={cx(buttonStyles[variant], className)} />;
}

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cx('rounded-2xl border border-border bg-surface p-4 sm:p-5', className)} />;
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'live' | 'success' | 'warning';
}) {
  const tones = {
    neutral: 'bg-border text-foreground',
    live: 'bg-primary text-primary-foreground',
    success: 'bg-success text-white',
    warning: 'bg-accent text-zinc-900',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide',
        tones[tone],
      )}>
      {tone === 'live' ? <span className="size-1.5 animate-pulse rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const inputStyles =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-base text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

export function Field({
  label,
  hint,
  className,
  ...props
}: ComponentProps<'input'> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <input {...props} className={cx(inputStyles, className)} />
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextArea({ label, className, ...props }: ComponentProps<'textarea'> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <textarea {...props} className={cx(inputStyles, 'min-h-28', className)} />
    </label>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{children}</h1>
      {sub ? <p className="text-muted">{sub}</p> : null}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <p className="text-lg font-bold">{title}</p>
      {body ? <p className="max-w-sm text-muted">{body}</p> : null}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  const tones = {
    info: 'border-border bg-surface',
    error: 'border-danger/40 bg-danger/10 text-danger',
    success: 'border-success/40 bg-success/10 text-success',
  };
  return <div className={cx('rounded-xl border px-4 py-3 text-sm', tones[tone])}>{children}</div>;
}
