import type { ReactNode } from 'react';

const navItems = [
  { label: 'Diagnose', href: '#diagnose' },
  { label: 'Safety', href: '#safety' },
  { label: 'API Health', href: '/api/health', external: true },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
              KriyaOS
            </p>
            <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
              Safety-First AI Copilot for Industrial Field Maintenance
            </h1>
            <p className="truncate text-xs text-foreground/70">AI-assisted maintenance. Safety-controlled decisions. <span className="text-foreground/55">Solar inverter prototype (synthetic/de-energized demo only).</span></p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-foreground/80">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            Safety-first prototype
          </div>
        </div>
        <nav
          aria-label="Primary"
          className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target={'external' in item && item.external ? '_blank' : undefined}
              rel={'external' in item && item.external ? 'noopener noreferrer' : undefined}
              className="whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground/85 transition hover:border-brand/40 hover:text-brand-strong"
            >
              {item.label}
              {'external' in item && item.external ? ' ↗' : ''}
            </a>
          ))}
        </nav>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs leading-5 text-foreground/70 sm:px-6">
          Demo policy: use synthetic or de-energized equipment only. Camera-based
          electrical hazard detection is not reliable; follow safety warnings and
          escalate dangerous electrical work.
        </div>
      </footer>
    </div>
  );
}
