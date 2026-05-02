interface FieldLabelProps {
  children: React.ReactNode;
}

export function FieldLabel({ children }: FieldLabelProps) {
  return (
    <span className="text-xs font-semibold tracking-widest text-foreground uppercase">
      {children}
    </span>
  );
}
