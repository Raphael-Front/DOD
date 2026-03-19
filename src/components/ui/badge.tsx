import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
        primary: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
        blue: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
        teal: "bg-[#d4f5f5] text-[#1a8080]",
        green: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
        orange: "bg-[var(--color-warning-bg)] text-[#b86300]",
        red: "bg-[var(--color-error-bg)] text-[var(--color-error)]",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-[var(--color-error-bg)] text-[var(--color-error)]",
        gray: "bg-[var(--color-gray-100)] text-[var(--text-tertiary)]",
        outline:
          "border-[var(--border-medium)] bg-transparent text-[var(--text-secondary)]",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
