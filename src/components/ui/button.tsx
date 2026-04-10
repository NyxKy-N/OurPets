import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "glass-button bg-primary/[0.24] text-foreground shadow-[0_18px_42px_hsl(var(--primary)/0.18)] hover:bg-primary/[0.3]",
        secondary:
          "glass-button bg-secondary/72 text-secondary-foreground hover:bg-secondary/82",
        outline:
          "glass-button bg-background/[0.62] text-foreground hover:bg-background/[0.76] hover:text-foreground",
        ghost:
          "rounded-full border border-transparent bg-transparent text-foreground/80 transition-[transform,background-color,color,opacity] duration-300 ease-out hover:-translate-y-0.5 hover:bg-accent/48 hover:text-foreground hover:shadow-none",
        destructive:
          "glass-button bg-destructive/[0.82] text-destructive-foreground shadow-[0_18px_42px_hsl(var(--destructive)/0.24)] hover:bg-destructive/[0.9]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...(!asChild ? { type: type ?? "button" } : {})}
      {...props}
    />
  );
}

export { Button, buttonVariants };
