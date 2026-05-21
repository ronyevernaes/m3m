import { useUiStore } from '../../store/ui';
import { useVaultStore } from '../../store/vault';
import { ContextPanelTabs } from './ContextPanelTabs';
import { DetailsTab } from './DetailsTab';
import { LinksTab } from './LinksTab';
import { BacklinksTab } from './BacklinksTab';
import { InsightsTab } from './InsightsTab';
import { AgentTab } from './AgentTab';

interface ContextPanelProps {
  onOpenNote: (path: string) => void;
  width?: number;
}

export function ContextPanel({ onOpenNote, width = 256 }: ContextPanelProps) {
  const currentNote = useVaultStore((s) => s.currentNote);
  const { contextPanelTab, setContextPanelTab } = useUiStore();

  if (!currentNote) return null;

  return (
    <div className="flex flex-col flex-shrink-0" style={{ width }}>
      <ContextPanelTabs activeTab={contextPanelTab} onTabChange={setContextPanelTab} />
      {contextPanelTab === 'details' && <DetailsTab />}
      {contextPanelTab === 'links' && <LinksTab onOpenNote={onOpenNote} />}
      {contextPanelTab === 'backlinks' && <BacklinksTab onOpenNote={onOpenNote} />}
      {contextPanelTab === 'insights' && <InsightsTab />}
      {contextPanelTab === 'agent' && <AgentTab />}
    </div>
  );
}
