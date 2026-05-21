import { cn } from '../../lib/cn';
import type { ContextPanelTab } from '../../store/ui';

const TABS: { id: ContextPanelTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'links', label: 'Links' },
  { id: 'backlinks', label: 'Backlinks' },
  { id: 'insights', label: 'Insights' },
  { id: 'agent', label: 'Agent' },
];

interface ContextPanelTabsProps {
  activeTab: ContextPanelTab;
  onTabChange: (tab: ContextPanelTab) => void;
}

export function ContextPanelTabs({ activeTab, onTabChange }: ContextPanelTabsProps) {
  return (
    <div className="flex border-b border-border overflow-x-auto flex-shrink-0">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={cn(
            'px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
            activeTab === id
              ? 'border-brand-500 text-heading'
              : 'border-transparent text-foreground hover:text-heading',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
