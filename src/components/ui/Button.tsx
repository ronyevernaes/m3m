import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const button = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-md cursor-pointer',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      intent: {
        primary: [
          'bg-brand-500 text-neutral-50',
          'hover:bg-brand-600',
          'dark:hover:bg-brand-400',
        ],
        secondary: [
          'border border-neutral-200 bg-neutral-100 text-neutral-800',
          'hover:bg-neutral-200',
          'dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
        ],
        ghost: [
          'bg-transparent text-neutral-600',
          'hover:bg-neutral-100 hover:text-neutral-800',
          'dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100',
        ],
        danger: [
          'bg-error-500 text-neutral-50',
          'hover:bg-error-600',
        ],
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      intent: 'primary',
      size: 'md',
    },
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, intent, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ intent, size }), className)}
      {...props}
    />
  )
);

Button.displayName = 'Button';
