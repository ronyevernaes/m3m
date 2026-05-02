import { useState } from 'react';
import { ActionCard } from './ActionCard';
import { NewVaultDialog } from './NewVaultDialog';
import { SparkleIcon } from '../icons/SparkleIcon';
import { CircleIcon } from '../icons/CircleIcon';
import type { VaultEntry } from '../../types/vault';

interface WelcomeScreenProps {
  onCreateNew: (name: string, path: string, color: string) => Promise<VaultEntry>;
  onOpenExisting: () => Promise<VaultEntry | null>;
}

export function WelcomeScreen({ onCreateNew, onOpenExisting }: WelcomeScreenProps) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="w-screen h-screen flex flex-col bg-background">

      {/*
        m-auto on a flex child distributes remaining space equally on all sides,
        centering the block both horizontally and vertically without needing
        justify-center / align-items-center on the parent — more reliable across webviews.
      */}
      <div className="m-auto flex flex-col items-center gap-12">

        <div className="flex flex-col items-center gap-3">
          <span className="font-heading font-bold text-8xl text-heading tracking-tighter leading-none">
            m3m
          </span>
          <p className="font-heading italic text-xl text-foreground text-center">
            your notes, your machine
          </p>
        </div>

        <hr className="w-24 border-border" />

        <div className="flex gap-6">
          <ActionCard
            variant="dark"
            icon={<SparkleIcon />}
            title="Create new vault"
            subtitle="start from scratch"
            onClick={() => setShowDialog(true)}
          />
          <ActionCard
            variant="light"
            icon={<CircleIcon />}
            title="Open existing folder"
            subtitle="any folder with .md files"
            onClick={() => onOpenExisting()}
          />
        </div>

      </div>

      {/* Tagline — sits at the natural bottom of the flex column */}
      <div className="mb-6 text-center text-xs text-foreground opacity-50">
        No account needed · Fully local · No wizard
      </div>

      {showDialog && (
        <NewVaultDialog
          onConfirm={async (name, path, color) => {
            await onCreateNew(name, path, color);
          }}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}
