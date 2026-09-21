import { cx } from "../utils/cx";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-block animate-spin rounded-full border-2 border-border-strong border-t-primary", className)}
    />
  );
}

export function PageSpinner({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div role="status" className={cx("flex items-center justify-center", fullScreen ? "min-h-screen" : "py-16")}>
      <Spinner className="h-8 w-8" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
