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
      border: {
        DEFAULT: "var(--color-border)",
        strong: "var(--color-border-strong)",
      },
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
      success: { DEFAULT: "var(--color-success)", bg: "var(--color-success-bg)" },
      warning: { DEFAULT: "var(--color-warning)", bg: "var(--color-warning-bg)" },
      danger: { DEFAULT: "var(--color-danger)", bg: "var(--color-danger-bg)" },
    },
    fontFamily: {
      sans: ["-apple-system", '"Segoe UI"', "Roboto", "Helvetica", "Arial", "sans-serif"],
    },
    extend: {
      // Minimum touch target for form controls (Build Guide §6).
      minHeight: { touch: "40px" },
    },
  },
} satisfies Config;
