import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';
import { XIcon } from '../icons/XIcon';

interface TabEntry {
  path: string;
  title: string;
  isDirty: boolean;
}

interface TabBarProps {
  tabs: TabEntry[];
  activeTabPath: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
}

const tabItem = cva(
  [
    'group relative flex items-center gap-1.5 pl-3 pr-1 py-1.5',
    'text-xs font-medium border-b-2 -mb-px max-w-[180px] flex-shrink-0',
    'transition-colors duration-150 cursor-pointer select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
  ],
  {
    variants: {
      active: {
        true: 'border-brand-500 text-heading bg-background',
        false: 'border-transparent text-foreground hover:text-heading hover:bg-muted',
      },
    },
    defaultVariants: { active: false },
  }
);

export function TabBar({ tabs, activeTabPath, onTabClick, onTabClose }: TabBarProps) {
  return (
    <div className="flex border-b border-border overflow-x-auto flex-shrink-0 bg-muted/30">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        return (
          <div
            key={tab.path}
            role="tab"
            tabIndex={0}
            aria-selected={isActive}
            onClick={() => onTabClick(tab.path)}
            onKeyDown={(e) => { if (e.key === 'Enter') onTabClick(tab.path); }}
            className={cn(tabItem({ active: isActive }))}
          >
            {tab.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" aria-label="Unsaved changes" />
            )}
            <span className="truncate flex-1 min-w-0">
              {tab.title || 'Untitled'}
            </span>
            <button
              type="button"
              aria-label={`Close ${tab.title || 'Untitled'}`}
              onClick={(e) => { e.stopPropagation(); onTabClose(tab.path); }}
              className={cn(
                'flex-shrink-0 rounded p-0.5 ml-0.5',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                isActive && 'opacity-100',
                'hover:bg-neutral-200 dark:hover:bg-neutral-700',
                'text-foreground hover:text-heading',
              )}
            >
              <XIcon />
            </button>
          </div>
        );
      })}
    </div>
  );
}
