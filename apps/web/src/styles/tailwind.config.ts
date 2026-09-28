import type { Config } from "tailwindcss";

// `colors` replaces Tailwind's palette instead of extending it, so only the design tokens
// in tokens.css can be used — no ad hoc colours (Build Guide §13).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      bg: "var(--color-bg)",
      surface: "var(--color-surface)",
      sunken: "var(--color-sunken)",
      border: {
        DEFAULT: "var(--color-border)",
        strong: "var(--color-border-strong)",
      },
      edge: "var(--color-edge)",
      divider: "var(--color-divider)",
      field: "var(--color-field)",
      hover: "var(--color-hover)",
      text: {
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",
      },
      primary: {
        DEFAULT: "var(--color-primary)",
        hover: "var(--color-primary-hover)",
        text: "var(--color-primary-text)",
      },
      accent: "var(--color-accent)",
      panel: {
        DEFAULT: "var(--color-panel)",
        raised: "var(--color-panel-raised)",
        edge: "var(--color-panel-edge)",
        muted: "var(--color-panel-muted)",
      },
      success: { DEFAULT: "var(--color-success)", bg: "var(--color-success-bg)" },
      warning: { DEFAULT: "var(--color-warning)", bg: "var(--color-warning-bg)" },
      danger: { DEFAULT: "var(--color-danger)", bg: "var(--color-danger-bg)" },
    },
    fontFamily: {
      sans: ["-apple-system", '"Segoe UI"', "Roboto", "Helvetica", "Arial", "sans-serif"],
      // Loaded on the sign-in screens only (see useDisplayFont); the system stack carries it
      // everywhere else, and until the font arrives.
      display: ["Outfit", "-apple-system", '"Segoe UI"', "Roboto", "Helvetica", "Arial", "sans-serif"],
    },
    extend: {
      // Minimum touch target for form controls (Build Guide §6).
      minHeight: { touch: "40px" },
      boxShadow: {
        raised: "var(--shadow-raised)",
      },
      keyframes: {
        "fade-out": { "0%, 60%": { opacity: "1" }, "100%": { opacity: "0" } },
        settle: { "0%": { opacity: "0.35", transform: "translateY(3px)" }, "100%": { opacity: "1", transform: "none" } },
        rise: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "none" } },
      },
      animation: {
        // The per-cell "saved" tick: visible briefly, then gone, so a full grid stays calm.
        "fade-out": "fade-out 2s ease-out forwards",
        // A changed total settles into place, showing what the last entry did.
        settle: "settle 220ms ease-out",
        // The one entrance on a page (auth card).
        rise: "rise 420ms cubic-bezier(0.2, 0.7, 0.2, 1) both",
      },
    },
  },
} satisfies Config;
