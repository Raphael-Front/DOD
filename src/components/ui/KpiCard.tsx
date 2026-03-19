"use client";

import { type HTMLAttributes } from "react";
import { clsx } from "clsx";
import Link from "next/link";

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

const variantStyles = {
  dark: {
    before: "var(--border-card-top-black)",
    value: "var(--text-primary)",
    iconBg: "rgba(30, 58, 95, 0.1)",
    iconColor: "var(--color-primary)",
  },
  teal: {
    before: "var(--border-card-top-teal)",
    value: "var(--color-accent-teal)",
    iconBg: "rgba(46, 168, 168, 0.1)",
    iconColor: "var(--color-accent-teal)",
  },
  orange: {
    before: "var(--border-card-top-orange)",
    value: "var(--color-accent-orange)",
    iconBg: "rgba(232, 130, 12, 0.1)",
    iconColor: "var(--color-accent-orange)",
  },
  green: {
    before: "var(--border-card-top-green)",
    value: "var(--color-accent-green)",
    iconBg: "rgba(34, 160, 75, 0.1)",
    iconColor: "var(--color-accent-green)",
  },
  red: {
    before: "var(--border-card-top-red)",
    value: "var(--color-accent-red)",
    iconBg: "rgba(217, 48, 37, 0.1)",
    iconColor: "var(--color-accent-red)",
  },
} as const;

export function KpiCard({
  variant = "dark",
  label,
  value,
  sub,
  link,
  icon,
  progress,
  className,
  style,
  ...props
}: KpiCardProps) {
  const s = variantStyles[variant];

  return (
    <div
      className={clsx("kpi-card", className)}
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-light)",
        borderRadius: 16,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        padding: "18px 20px 16px",
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.2s, transform 0.15s",
        ...style,
      }}
      data-variant={variant}
      {...props}
    >
      {/* Borda colorida 4px no topo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: s.before,
          borderRadius: "16px 16px 0 0",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            color: "#6b7280",
            fontFamily: "var(--font-sans)",
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: s.iconBg,
              color: s.iconColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "var(--letter-spacing-tight)",
          lineHeight: 1,
          marginBottom: 6,
          color: s.value,
          fontFamily: "var(--font-sans)",
        }}
      >
        {value}
      </div>

      {sub && (
        <div
          style={{
            fontSize: 12,
            color: "#9ca3af",
            marginTop: 8,
            fontFamily: "var(--font-sans)",
          }}
        >
          {sub}
        </div>
      )}

      {link && (
        <Link
          href={link.href}
          style={{
            fontSize: "var(--font-size-mini)",
            color: "var(--color-accent-blue)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            marginTop: 6,
            fontFamily: "var(--font-sans)",
          }}
          className="hover:underline"
        >
          {link.label} →
        </Link>
      )}

      {progress !== undefined && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              height: 4,
              background: "var(--color-gray-200)",
              borderRadius: "var(--radius-full)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "var(--color-accent-green)",
                borderRadius: "var(--radius-full)",
                transition: "width var(--duration-slow) var(--ease-out-expo)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
