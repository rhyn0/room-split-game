import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '../../lib/utils';

export const inputVariants = cva(
  'w-full rounded-xl bg-slate-950/85 border px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-slate-700/80 focus:border-indigo-500',
        optionA: 'border-sky-500/40 focus:border-sky-400',
        optionB: 'border-rose-500/40 focus:border-rose-400',
        code: 'border-slate-700/80 focus:border-indigo-500 uppercase font-display font-extrabold tracking-[0.2em] text-lg text-center',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, ...props }, ref) => (
    <input ref={ref} className={cn(inputVariants({ variant }), className)} {...props} />
  )
);
Input.displayName = 'Input';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof inputVariants> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof inputVariants> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  )
);
Select.displayName = 'Select';
