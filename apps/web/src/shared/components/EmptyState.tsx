import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-field px-6 py-14 text-center">
      <p className="text-base font-medium">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-text-secondary">{children}</p>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md bg-surface px-1.5 py-0.5 font-sans text-xs font-medium text-text-primary shadow-raised">
      {children}
    </kbd>
  );
}
