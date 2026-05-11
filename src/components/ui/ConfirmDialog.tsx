import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/30 flex items-center justify-center z-50">
      <div className="bg-background rounded-2xl p-8 w-96 shadow-lg flex flex-col gap-6">
        <h2 className="font-heading font-bold text-xl text-center text-heading">{title}</h2>
        <p className="text-sm text-foreground text-center">{message}</p>
        <div className="flex gap-3 pt-2">
          <Button intent="secondary" size="lg" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button intent="danger" size="lg" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
