import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-[13px] font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(30,58,95,0.2)] hover:bg-[var(--color-primary-hover)] hover:shadow-[0_2px_6px_rgba(30,58,95,0.25)]",
        accent:
          "bg-[#4a7fc1] text-white shadow-[0_1px_2px_rgba(74,127,193,0.3)] hover:bg-[#3d6faf]",
        destructive:
          "bg-destructive text-white shadow-[0_1px_2px_rgba(217,48,37,0.25)] hover:bg-[#c1271d]",
        outline:
          "border border-[var(--border-medium)] bg-[var(--surface-card)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[var(--color-gray-50)] hover:border-[var(--border-strong)]",
        secondary:
          "border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[var(--color-gray-50)]",
        ghost:
          "hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]",
        success: "bg-[#22a04b] text-white hover:bg-[#1a8a3e]",
        warning: "bg-[#e8820c] text-white hover:bg-[#d0730a]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
