"use client";

import { type HTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Padding interno do card */
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = "md", className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        "bg-[var(--surface-card)] border border-[var(--border-light)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]",
        "transition-[box-shadow,transform] duration-200",
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = "Card";
