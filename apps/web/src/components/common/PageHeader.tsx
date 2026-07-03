import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 pb-1 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-[13px] text-text-muted leading-relaxed">{description}</p> : null}
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap gap-2 [&>*]:w-full md:[&>*]:w-auto">{action}</div>
      ) : null}
    </div>
  );
}
