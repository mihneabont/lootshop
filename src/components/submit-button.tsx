'use client';

import type { ComponentProps } from 'react';
import { useFormStatus } from 'react-dom';

import { buttonStyles, cx } from '@/components/ui';

export function SubmitButton({
  children,
  pendingText,
  variant = 'primary',
  className,
  confirm,
  ...props
}: ComponentProps<'button'> & { pendingText?: string; variant?: keyof typeof buttonStyles; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
        props.onClick?.(e);
      }}
      className={cx(buttonStyles[variant], className)}>
      {pending ? (pendingText ?? 'Se trimite…') : children}
    </button>
  );
}
