"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  success?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      success = false,
      className,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[12px] font-semibold text-[#374151] mb-[6px]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={clsx(
            "font-[var(--font-sans)] text-[14px] text-[var(--text-primary)]",
            "bg-[var(--surface-card)] border-[1.5px] border-[#e2e8f0] rounded-[10px] px-[14px] py-[10px] w-full",
            "transition-colors duration-150 outline-none",
            "hover:border-[#cbd5e1]",
            "focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]",
            error && "border-[var(--color-error)] shadow-[var(--focus-ring-error)]",
            success &&
              "border-[var(--color-success)] shadow-[var(--focus-ring-success)]",
            disabled &&
              "bg-[var(--color-gray-50)] opacity-[var(--opacity-disabled)] cursor-not-allowed",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <span className="text-[var(--font-size-mini)] text-[var(--text-tertiary)]">
            {hint}
          </span>
        )}
        {error && (
          <span className="text-[var(--font-size-mini)] text-[var(--color-error)]">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
