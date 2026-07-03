import type { ReactNode } from 'react';
import { InboxIcon } from 'lucide-react';

export function EmptyState({
  title,
  text,
  description,
  action,
  icon: Icon = InboxIcon,
}: {
  title: string;
  text?: string;
  description?: string;
  action?: ReactNode;
  icon?: React.ElementType;
}) {
  const body = text ?? description;
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border-light bg-gradient-to-b from-bg-soft to-white p-10 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-white shadow-card border border-border-light" aria-hidden="true">
        <Icon size={22} className="text-text-muted" />
      </div>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-[13px] text-text-muted leading-relaxed">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
