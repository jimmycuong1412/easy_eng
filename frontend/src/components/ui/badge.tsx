import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-accent-primary text-white',
        secondary:
          'border-transparent bg-bg-elevated text-text-secondary',
        destructive:
          'border-transparent bg-error text-white',
        outline:
          'border-border-default text-text-secondary',
        success:
          'border-transparent bg-success text-white',
        warning:
          'border-transparent bg-warning text-bg-primary',
        cookie:
          'border-transparent bg-accent-cookie/20 text-accent-cookie',
        gold:
          'border-transparent bg-accent-gold/20 text-accent-gold',
        level:
          'border-transparent bg-accent-secondary/20 text-accent-secondary font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
