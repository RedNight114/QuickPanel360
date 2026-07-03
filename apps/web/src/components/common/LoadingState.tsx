import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{text}</p>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-3/4" />
    </div>
  );
}
