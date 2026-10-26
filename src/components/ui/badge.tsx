import { cva, type VariantProps } from 'class-variance-authority';
import type React from 'react';
import { cn } from '../../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 font-bold rounded-full border tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-indigo-500/20 border-indigo-400/35 text-indigo-300',
        optionA: 'bg-sky-500/15 border-sky-400/40 text-sky-300',
        optionB: 'bg-rose-500/15 border-rose-400/40 text-rose-300',
        judge: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
        bot: 'bg-cyan-500/15 border-cyan-400/35 text-cyan-300',
        activePower: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
        passiveRole: 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300',
        success: 'bg-emerald-500/20 border-emerald-400/45 text-emerald-300',
        danger: 'bg-rose-500/20 border-rose-400/45 text-rose-300',
        muted: 'bg-slate-800/80 border-slate-700 text-slate-300',
      },
      size: {
        sm: 'px-2.5 py-0.5 text-[11px]',
        md: 'px-3 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, size, ...props }) => (
  <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
);
