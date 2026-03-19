"use client";

import { type HTMLAttributes } from "react";
import { clsx } from "clsx";

export type BadgeVariant =
  | "primary"
  | "blue"
  | "teal"
  | "green"
  | "orange"
  | "red"
  | "gray"
  | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary:
    "bg-[var(--color-primary-subtle)] text-[var(--color-primary)] [&_.badge-dot]:bg-[var(--color-primary)]",
  blue:
    "bg-[var(--color-info-bg)] text-[var(--color-info)] [&_.badge-dot]:bg-[var(--color-info)]",
  teal:
    "bg-[var(--badge-teal-bg)] text-[var(--badge-teal-text)] [&_.badge-dot]:bg-[var(--badge-teal-text)]",
  green:
    "bg-[var(--color-success-bg)] text-[var(--color-success)] [&_.badge-dot]:bg-[var(--color-success)]",
  orange:
    "bg-[var(--color-warning-bg)] text-[var(--badge-orange-text)] [&_.badge-dot]:bg-[var(--badge-orange-text)]",
  red:
    "bg-[var(--color-error-bg)] text-[var(--color-error)] [&_.badge-dot]:bg-[var(--color-error)]",
  gray:
    "bg-[var(--color-gray-100)] text-[var(--text-tertiary)] [&_.badge-dot]:bg-[var(--color-gray-500)]",
  outline:
    "bg-transparent border border-[var(--border-medium)] text-[var(--text-secondary)]",
};

export function Badge({
  variant = "primary",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 text-[11px] font-semibold rounded-[20px] whitespace-nowrap",
        variantClasses[variant],
        className
      )}
      style={{ padding: "4px 10px" }}
      {...props}
    >
      {dot && <span className="badge-dot w-1.5 h-1.5 rounded-full shrink-0" />}
      {children}
    </span>
  );
}
