import { Badge } from '@/components/ui/badge';
import { getStatusBadgeStyle } from '@/lib/design';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('rounded-full font-medium', getStatusBadgeStyle(status))}
    >
      {status}
    </Badge>
  );
}
