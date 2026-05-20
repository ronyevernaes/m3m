import { useCallback, useRef } from 'react';
import { cn } from '../../lib/cn';

interface ResizeHandleProps {
  side: 'left' | 'right';
  initialWidth: number;
  onResize: (w: number) => void;
  className?: string;
}

export function ResizeHandle({ side, initialWidth, onResize, className }: ResizeHandleProps) {
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startWidth.current = initialWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX.current;
      onResize(side === 'left' ? startWidth.current + delta : startWidth.current - delta);
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [side, initialWidth, onResize]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={cn(
        'w-1 flex-shrink-0 bg-border cursor-col-resize transition-colors hover:bg-brand-500/50 active:bg-brand-500',
        className,
      )}
      onMouseDown={handleMouseDown}
    />
  );
}
