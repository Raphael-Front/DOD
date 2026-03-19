"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "warning";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white shadow-[0_1px_4px_rgba(0,0,0,0.15)] hover:bg-[var(--color-primary-hover)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.2)] hover:-translate-y-px",
  accent:
    "bg-[var(--color-accent-blue)] text-white shadow-[var(--shadow-btn-accent)] hover:bg-[var(--color-accent-blue-hover)] hover:-translate-y-px",
  secondary:
    "bg-white text-[#374151] border-[1.5px] border-[#e2e8f0] hover:bg-[#f8fafc] hover:border-[#cbd5e1] hover:-translate-y-px",
  ghost:
    "bg-transparent text-[#6b7280] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] hover:-translate-y-px",
  danger:
    "bg-[var(--color-error)] text-white shadow-[var(--shadow-btn-danger)] hover:bg-[var(--color-error-hover)] hover:-translate-y-px",
  success: "bg-[var(--color-success)] text-white hover:opacity-90 hover:-translate-y-px",
  warning: "bg-[var(--color-warning)] text-white hover:opacity-90 hover:-translate-y-px",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1 text-[var(--font-size-mini)] rounded-[10px]",
  sm: "px-3 py-1.5 text-[12px] font-semibold rounded-[10px]",
  md: "px-4 py-2.5 text-[13px] font-semibold rounded-[10px]",
  lg: "px-[18px] py-[10px] text-[13px] font-semibold rounded-[10px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={clsx(
          "inline-flex items-center justify-center gap-2 font-semibold border-none cursor-pointer transition-all duration-150 ease-out whitespace-nowrap",
          "active:translate-y-0",
          "disabled:opacity-[var(--opacity-disabled)] disabled:cursor-not-allowed disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2
            className="w-4 h-4 animate-spin shrink-0"
            strokeWidth={2}
            aria-hidden
          />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
