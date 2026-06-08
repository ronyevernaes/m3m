import { useUiStore } from '../../store/ui';
import { useVaultStore } from '../../store/vault';
import { cn } from '../../lib/cn';
import { ContextPanelTabs } from './ContextPanelTabs';
import { DetailsTab } from './DetailsTab';
import { LinksAndBacklinksTab } from './LinksAndBacklinksTab';
import { InsightsTab } from './InsightsTab';
import { AgentTab } from './AgentTab';
import { OutlineTab } from './OutlineTab';

interface ContextPanelProps {
  onOpenNote: (path: string) => void;
  width?: number;
  className?: string;
}

export function ContextPanel({ onOpenNote, width = 256, className }: ContextPanelProps) {
  const currentNote = useVaultStore((s) => s.currentNote);
  const { contextPanelTab, setContextPanelTab } = useUiStore();

  if (!currentNote) return null;

  // Migrate users who have the removed 'backlinks' tab persisted in localStorage
  const activeTab = (contextPanelTab as string) === 'backlinks' ? 'links' : contextPanelTab;

  return (
    <div data-tour="context-panel" className={cn('flex flex-col flex-shrink-0', className)} style={{ width }}>
      <ContextPanelTabs activeTab={activeTab} onTabChange={setContextPanelTab} />
      {activeTab === 'details' && <DetailsTab />}
      {activeTab === 'links' && <LinksAndBacklinksTab onOpenNote={onOpenNote} />}
      {activeTab === 'outline' && <OutlineTab />}
      {activeTab === 'insights' && <InsightsTab />}
      {activeTab === 'agent' && <AgentTab />}
    </div>
  );
}
