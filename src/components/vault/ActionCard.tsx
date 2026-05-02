import { cn } from '../../lib/cn';

interface ActionCardProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  variant: 'dark' | 'light';
  className?: string;
}

export function ActionCard({ onClick, icon, title, subtitle, variant, className }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-8 rounded-2xl px-12 py-16 w-72 text-center transition-colors cursor-pointer border',
        variant === 'dark'
          ? 'bg-neutral-950 border-transparent text-white hover:bg-neutral-900'
          : 'bg-transparent border-border text-heading hover:bg-muted',
        className,
      )}
    >
      {/* div instead of span: flex-col only works reliably on block-level elements */}
      <div className={cn(variant === 'dark' ? 'text-white' : 'text-heading')}>
        {icon}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <p className={cn('font-heading font-bold text-lg', variant === 'dark' ? 'text-white' : 'text-heading')}>
          {title}
        </p>
        <p className={cn('text-sm', variant === 'dark' ? 'text-neutral-500' : 'text-foreground')}>
          {subtitle}
        </p>
      </div>
    </button>
  );
}
