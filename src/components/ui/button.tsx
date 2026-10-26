import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 cursor-pointer border whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400/30 text-white shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-indigo-500/40',
        secondary:
          'bg-slate-800/90 border-slate-700 text-slate-100 hover:border-indigo-400 hover:bg-slate-800',
        optionA:
          'bg-sky-400 border-sky-300 text-sky-950 font-extrabold shadow-lg shadow-sky-500/20 hover:bg-sky-300',
        optionB:
          'bg-rose-400 border-rose-300 text-rose-950 font-extrabold shadow-lg shadow-rose-500/20 hover:bg-rose-300',
        amber:
          'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-300 text-slate-950 font-bold shadow-md shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400',
        destructive:
          'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25 hover:border-rose-400',
        ghost:
          'bg-transparent border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-600 hover:bg-slate-800/40',
      },
      size: {
        xs: 'px-2.5 py-1 text-xs rounded-lg',
        sm: 'px-3 py-1.5 text-xs rounded-lg',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-5 py-3.5 text-base',
        icon: 'p-2 rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
