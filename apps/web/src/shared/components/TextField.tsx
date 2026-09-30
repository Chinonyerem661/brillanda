import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "../utils/cx";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  /** Sits inside the field's right edge, e.g. a show/hide button. */
  trailing?: ReactNode;
};

/** Label above the field, 44px touch target (design/patterns/auth.md §6). 16px text stops phones zooming in. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, trailing, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cx(
            "block min-h-[46px] w-full rounded-[14px] border-0 px-4 text-base transition-colors placeholder:text-text-muted",
            "focus:outline-none focus:ring-2",
            trailing ? "pr-[4.5rem]" : false,
            error
              ? "bg-danger-bg ring-2 ring-danger focus:ring-danger"
              : "bg-sunken hover:bg-hover focus:bg-surface focus:ring-accent",
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {message && (
        <p id={messageId} className={cx("mt-1.5 text-sm", error ? "text-danger" : "text-text-secondary")}>
          {message}
        </p>
      )}
    </div>
  );
});
