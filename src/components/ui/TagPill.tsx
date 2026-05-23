import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const tagPill = cva(
  [
    'inline-flex items-center gap-1',
    'rounded-full px-2 py-0.5 text-xs font-medium',
    'transition-colors duration-150',
  ],
  {
    variants: {
      variant: {
        default: 'bg-muted text-foreground',
        interactive: [
          'cursor-pointer select-none',
          'bg-muted text-foreground/70',
          'hover:bg-accent-subtle hover:text-accent',
        ],
        removable: [
          'bg-accent-subtle text-accent',
        ],
      },
      selected: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'interactive',
        selected: true,
        className: 'bg-accent-subtle text-accent hover:bg-accent-subtle hover:text-accent',
      },
    ],
    defaultVariants: {
      variant: 'default',
      selected: false,
    },
  }
);

interface TagPillProps extends VariantProps<typeof tagPill> {
  label: string;
  count?: number;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function TagPill({ label, count, variant, selected, onRemove, onClick, className }: TagPillProps) {
  return (
    <span
      className={cn(tagPill({ variant, selected }), className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {label}
      {count !== undefined && (
        <span className="tabular-nums opacity-70">{count}</span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full hover:bg-accent/20 p-0.5 leading-none"
          aria-label={`Remove tag ${label}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
