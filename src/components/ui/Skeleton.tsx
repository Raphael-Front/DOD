"use client";

import { clsx } from "clsx";

export interface SkeletonProps {
  className?: string;
  /** Largura (ex: "w-full", "w-32") */
  width?: string;
  /** Altura (ex: "h-4", "h-20") */
  height?: string;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-[var(--radius-md)] bg-[var(--color-gray-200)]",
        width,
        height,
        className
      )}
      aria-hidden
    />
  );
}
