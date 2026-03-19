"use client";

import { type HTMLAttributes } from "react";
import { clsx } from "clsx";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

const variantClasses: Record<AlertVariant, string> = {
  info: "bg-[var(--color-info-bg)] border-l-[var(--color-info)] text-[var(--alert-info-text)]",
  success:
    "bg-[var(--color-success-bg)] border-l-[var(--color-success)] text-[var(--alert-success-text)]",
  warning:
    "bg-[var(--color-warning-bg)] border-l-[var(--color-warning)] text-[var(--alert-warning-text)]",
  error:
    "bg-[var(--color-error-bg)] border-l-[var(--color-error)] text-[var(--alert-error-text)]",
};

export function Alert({
  variant = "info",
  title,
  description,
  icon,
  className,
  children,
  ...props
}: AlertProps) {
  const content = children ?? (
    <>
      {title && (
        <div className="font-semibold mb-0.5">{title}</div>
      )}
      {description && (
        <div className="opacity-80 leading-snug">{description}</div>
      )}
    </>
  );

  return (
    <div
      role="alert"
      className={clsx(
        "flex items-start gap-2.5 py-3 px-4 rounded-[var(--radius-lg)] border-l-[3px] text-[var(--font-size-small)]",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon && (
        <span className="text-base shrink-0 mt-0.5" aria-hidden>
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">{content}</div>
    </div>
  );
}
