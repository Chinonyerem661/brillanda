import type { ButtonHTMLAttributes } from "react";
import { cx } from "../utils/cx";
import { Spinner } from "./Spinner";

// One solid primary button per screen section; everything else secondary or ghost (Build Guide §6).
const VARIANTS = {
  primary: "bg-primary text-primary-text hover:bg-primary-hover disabled:bg-border-strong",
  secondary: "border border-border-strong bg-surface text-text-primary hover:bg-bg disabled:text-text-muted",
  ghost: "text-text-secondary hover:bg-bg hover:text-text-primary disabled:text-text-muted",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        "inline-flex min-h-touch items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
