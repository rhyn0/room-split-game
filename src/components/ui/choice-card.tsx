import { cva, type VariantProps } from 'class-variance-authority';
import type React from 'react';
import { cn } from '../../lib/utils';

export const choiceCardVariants = cva(
  'flex flex-col justify-between gap-3.5 rounded-2xl border-2 p-5 text-left transition-all duration-150',
  {
    variants: {
      side: {
        A: 'bg-sky-500/10 border-sky-400/40 text-slate-100',
        B: 'bg-rose-500/10 border-rose-400/40 text-slate-100',
      },
      selected: {
        true: '-translate-y-0.5',
        false: '',
      },
      interactive: {
        true: 'cursor-pointer hover:-translate-y-0.5',
        false: 'cursor-default',
      },
    },
    compoundVariants: [
      {
        side: 'A',
        selected: true,
        className: 'border-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.35)]',
      },
      {
        side: 'B',
        selected: true,
        className: 'border-rose-400 shadow-[0_0_24px_rgba(251,113,133,0.35)]',
      },
      {
        side: 'A',
        interactive: true,
        className: 'hover:border-sky-400/80',
      },
      {
        side: 'B',
        interactive: true,
        className: 'hover:border-rose-400/80',
      },
    ],
    defaultVariants: {
      side: 'A',
      selected: false,
      interactive: false,
    },
  }
);

export type ChoiceCardVariantProps = VariantProps<typeof choiceCardVariants>;

export const ChoiceSideLabel: React.FC<{ side: 'A' | 'B' }> = ({ side }) => (
  <span
    className={cn(
      'text-xs font-extrabold tracking-widest uppercase',
      side === 'A' ? 'text-sky-400' : 'text-rose-400'
    )}
  >
    OPTION {side}
  </span>
);
