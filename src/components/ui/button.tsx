import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-0 dark:focus-visible:ring-opacity-60 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/50 dark:bg-primary/80 dark:text-primary-foreground dark:hover:bg-primary/70 dark:hover:shadow-[0_0_12px_var(--glow-primary)] dark:focus-visible:ring-primary/60",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/50 dark:bg-destructive/80 dark:hover:bg-destructive/70 dark:hover:shadow-[0_0_12px_var(--glow-destructive)] dark:focus-visible:ring-destructive/60",
        outline:
          "border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent/50 dark:bg-background/5 dark:border-input/60 dark:text-foreground dark:hover:bg-accent/20 dark:hover:border-accent/50 dark:hover:shadow-[0_0_12px_var(--glow-accent)] dark:focus-visible:ring-accent/40",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:ring-secondary/50 dark:bg-secondary/20 dark:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:shadow-[0_0_12px_var(--glow-secondary)] dark:focus-visible:ring-secondary/40",
        ghost:
          "hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent/40 dark:text-foreground/90 dark:hover:bg-accent/20 dark:hover:text-foreground dark:focus-visible:ring-accent/30",
        link: 
          "text-primary underline-offset-4 hover:underline focus-visible:ring-primary/40 dark:text-primary/90 dark:hover:text-primary dark:focus-visible:ring-primary/30",
        glowing:
          "border border-primary/20 bg-primary/5 text-primary shadow-[0_0_5px_var(--glow-primary)] hover:bg-primary/10 hover:shadow-[0_0_10px_var(--glow-primary)] focus-visible:ring-primary/60 dark:border-primary/30 dark:bg-primary/10 dark:text-primary dark:hover:bg-primary/20 dark:hover:shadow-[0_0_20px_var(--glow-primary)] dark:focus-visible:ring-primary/60",
        "glowing-secondary":
          "border border-secondary/20 bg-secondary/5 text-secondary shadow-[0_0_5px_var(--glow-secondary)] hover:bg-secondary/10 hover:shadow-[0_0_10px_var(--glow-secondary)] focus-visible:ring-secondary/60 dark:border-secondary/30 dark:bg-secondary/10 dark:text-secondary dark:hover:bg-secondary/20 dark:hover:shadow-[0_0_20px_var(--glow-secondary)] dark:focus-visible:ring-secondary/60",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
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
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
