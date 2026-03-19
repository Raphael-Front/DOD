"use client";

import { type HTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export type KpiCardVariant = "dark" | "teal" | "orange" | "green" | "red";

export interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: KpiCardVariant;
  label: string;
  value: React.ReactNode;
  sub?: string;
  link?: { href: string; label: string };
  icon?: React.ReactNode;
  progress?: number;
}

const variantBorderColor: Record<KpiCardVariant, string> = {
  dark: "var(--border-card-top-black)",
  teal: "var(--border-card-top-teal)",
  orange: "var(--border-card-top-orange)",
  green: "var(--border-card-top-green)",
  red: "var(--border-card-top-red)",
};

const variantValueColor: Record<KpiCardVariant, string> = {
  dark: "var(--text-primary)",
  teal: "var(--color-accent-teal)",
  orange: "var(--color-accent-orange)",
  green: "var(--color-accent-green)",
  red: "var(--color-accent-red)",
};

const variantIconBg: Record<KpiCardVariant, string> = {
  dark: "var(--kpi-icon-dark-bg)",
  teal: "var(--kpi-icon-teal-bg)",
  orange: "var(--kpi-icon-orange-bg)",
  green: "var(--kpi-icon-green-bg)",
  red: "var(--kpi-icon-red-bg)",
};

const variantIconColor: Record<KpiCardVariant, string> = {
  dark: "var(--color-primary)",
  teal: "var(--color-accent-teal)",
  orange: "var(--color-accent-orange)",
  green: "var(--color-accent-green)",
  red: "var(--color-accent-red)",
};

export function KpiCard({
  variant = "dark",
  label,
  value,
  sub,
  link,
  icon,
  progress,
  className,
  ...props
}: KpiCardProps) {
  return (
    <Card
      padding="none"
      className={cn(
        "relative overflow-hidden border-[var(--border-light)] shadow-[var(--shadow-card)]",
        className
      )}
      data-variant={variant}
      {...props}
    >
      <div
        aria-hidden
        className="absolute left-0 right-0 top-0 h-[3px] rounded-t-xl"
        style={{ backgroundColor: variantBorderColor[variant] }}
      />
      <div className="pt-[18px] px-5 pb-4 flex flex-col">
        <div className="flex flex-row items-start justify-between mb-[10px]">
          <span
            className="text-[13px] font-medium text-[var(--text-tertiary)]"
            style={{ letterSpacing: "var(--letter-spacing-wide)" }}
          >
            {label}
          </span>
          {icon && (
            <div
              className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
              style={{
                backgroundColor: variantIconBg[variant],
                color: variantIconColor[variant],
              }}
            >
              {icon}
            </div>
          )}
        </div>
        <div
          className="text-[2rem] font-bold leading-none tracking-tight mb-1.5"
          style={{ color: variantValueColor[variant] }}
        >
          {value}
        </div>
        {sub && (
          <p className="text-[12px] text-[var(--text-tertiary)]">{sub}</p>
        )}
        {link && (
          <Link
            href={link.href}
            className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-[var(--color-accent-blue)] hover:underline"
          >
            {link.label} →
          </Link>
        )}
        {progress !== undefined && (
          <div className="mt-2.5">
            <div className="h-1 overflow-hidden rounded-full bg-[var(--color-gray-200)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent-green)] transition-all duration-300 ease-[var(--ease-out-expo)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
