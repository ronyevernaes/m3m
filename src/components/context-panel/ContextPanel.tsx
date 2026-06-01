import { useUiStore } from '../../store/ui';
import { useVaultStore } from '../../store/vault';
import { cn } from '../../lib/cn';
import { ContextPanelTabs } from './ContextPanelTabs';
import { DetailsTab } from './DetailsTab';
import { LinksTab } from './LinksTab';
import { BacklinksTab } from './BacklinksTab';
import { InsightsTab } from './InsightsTab';
import { AgentTab } from './AgentTab';

interface ContextPanelProps {
  onOpenNote: (path: string) => void;
  width?: number;
  className?: string;
}

export function ContextPanel({ onOpenNote, width = 256, className }: ContextPanelProps) {
  const currentNote = useVaultStore((s) => s.currentNote);
  const { contextPanelTab, setContextPanelTab } = useUiStore();

  if (!currentNote) return null;

  return (
    <div className={cn('flex flex-col flex-shrink-0', className)} style={{ width }}>
      <ContextPanelTabs activeTab={contextPanelTab} onTabChange={setContextPanelTab} />
      {contextPanelTab === 'details' && <DetailsTab />}
      {contextPanelTab === 'links' && <LinksTab onOpenNote={onOpenNote} />}
      {contextPanelTab === 'backlinks' && <BacklinksTab onOpenNote={onOpenNote} />}
      {contextPanelTab === 'insights' && <InsightsTab />}
      {contextPanelTab === 'agent' && <AgentTab />}
    </div>
  );
}
