import { cn } from '../../lib/cn';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function FormInput({ className, ...props }: FormInputProps) {
  return (
    <input
      className={cn(
        'w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-muted text-heading',
        'focus:outline-none focus:ring-2 focus:ring-brand-500',
        className,
      )}
      {...props}
    />
  );
}
