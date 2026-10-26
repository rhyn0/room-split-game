import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '../../lib/utils';

export const cardVariants = cva(
  'rounded-2xl border backdrop-blur-md shadow-2xl transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-slate-900/85 border-slate-800/80 text-slate-100',
        elevated:
          'bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700/80 text-slate-100',
        optionA: 'bg-sky-500/10 border-sky-400/40 text-slate-100',
        optionB: 'bg-rose-500/10 border-rose-400/40 text-slate-100',
        passiveRole:
          'bg-gradient-to-br from-indigo-950/85 to-slate-900/95 border-indigo-500/45 text-slate-100',
        activeRole:
          'bg-gradient-to-br from-amber-950/75 to-slate-900/95 border-amber-500/50 text-slate-100',
        danger: 'bg-rose-950/40 border-rose-500/45 text-slate-100',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';
