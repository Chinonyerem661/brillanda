import { useId, type InputHTMLAttributes } from "react";
import { cx } from "../utils/cx";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Label above the field, 40px+ touch target (Build Guide §6). 16px text stops phones zooming in. */
export function TextField({ label, error, hint, id, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cx(
          "block min-h-[44px] w-full rounded-lg border bg-surface px-3.5 text-base transition-colors placeholder:text-text-muted",
          "focus:outline-none focus:ring-1",
          error
            ? "border-danger focus:ring-danger"
            : "border-border hover:border-border-strong focus:border-accent focus:ring-accent",
        )}
        {...props}
      />
      {message && (
        <p id={messageId} className={cx("mt-1.5 text-sm", error ? "text-danger" : "text-text-secondary")}>
          {message}
        </p>
      )}
    </div>
  );
}
