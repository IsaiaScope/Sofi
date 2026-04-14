interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
}

export function EmptyState({ title, description, icon = "+" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sofi-elevated text-lg text-sofi-text-muted">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-sofi-text">{title}</p>
        {description && <p className="mt-1 text-xs text-sofi-text-muted">{description}</p>}
      </div>
    </div>
  );
}
