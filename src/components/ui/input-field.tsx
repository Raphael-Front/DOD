"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface InputFieldProps
  extends Omit<React.ComponentProps<typeof Input>, "id"> {
  label?: string;
  hint?: string;
  error?: string;
  id?: string;
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, hint, error, id, className, ...props }, ref) => {
    const inputId = id ?? React.useId();
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <Label
            htmlFor={inputId}
            className="text-[13px] font-medium text-[var(--text-secondary)]"
          >
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          id={inputId}
          className={cn(
            error && "border-[var(--color-error)] focus-visible:ring-[var(--color-error)]/20",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={hint ? `${inputId}-hint` : error ? `${inputId}-error` : undefined}
          {...props}
        />
        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="text-[12px] text-[var(--text-tertiary)]"
          >
            {hint}
          </p>
        )}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-[12px] text-[var(--color-error)]"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

InputField.displayName = "InputField";

export { InputField };
