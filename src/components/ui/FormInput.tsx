import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-muted text-heading',
        'focus:outline-none focus:ring-2 focus:ring-brand-500',
        className,
      )}
      {...props}
    />
  ),
);

FormInput.displayName = 'FormInput';
