import { useState } from 'react';
import { cn } from '../../lib/cn';

interface AccordionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Accordion({ title, count, defaultOpen = true, className, children }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('flex flex-col', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold tracking-widest uppercase text-foreground hover:text-heading transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {title}
          <span className="font-normal normal-case tracking-normal text-foreground/50 tabular-nums">
            ({count})
          </span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn('shrink-0 transition-transform duration-150', !isOpen && '-rotate-90')}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}
