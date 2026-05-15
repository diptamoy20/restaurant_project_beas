import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

export function PageShell({ children, className = '' }: PageShellProps) {
  return <main className={`qr-app-shell ${className}`}>{children}</main>;
}
