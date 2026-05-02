import { cn } from '../../lib/cn';

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onSelect: (color: string) => void;
}

export function ColorSwatch({ color, selected, onSelect }: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(color)}
      // style is required: color is a runtime value and cannot be expressed as a static Tailwind class
      style={{ backgroundColor: color }}
      className={cn(
        'w-9 h-9 rounded-full transition-all',
        selected ? 'ring-2 ring-offset-2 ring-heading' : 'opacity-80 hover:opacity-100',
      )}
      aria-label={color}
    />
  );
}
