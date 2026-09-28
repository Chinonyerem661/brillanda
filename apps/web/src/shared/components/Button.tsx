import type { ButtonHTMLAttributes } from "react";
import { cx } from "../utils/cx";
import { Spinner } from "./Spinner";

// One solid primary button per screen section; everything else secondary or ghost (Build Guide §6).
const VARIANTS = {
  primary: "bg-primary text-primary-text hover:bg-primary-hover",
  secondary: "border border-border-strong bg-surface text-text-primary hover:bg-bg disabled:text-text-muted",
  ghost: "text-text-secondary hover:bg-bg hover:text-text-primary disabled:text-text-muted",
};

// `lg` is the sign-in screens' button: taller, a touch rounder (design/patterns/auth.md §7).
const SIZES = {
  md: "min-h-touch rounded-md",
  lg: "min-h-[44px] rounded-[10px]",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
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
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-2 px-4 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed",
        SIZES[size],
        VARIANTS[variant],
        // A solid button that is merely unavailable goes grey; one that is working keeps its
        // colour and shows the spinner, so it reads as "in progress", not "broken".
        variant === "primary" && !loading && "disabled:bg-border-strong",
        loading && "cursor-progress",
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" onSolid />}
      {children}
    </button>
  );
}
