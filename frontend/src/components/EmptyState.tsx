import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 px-6 py-8 text-center">
      <Inbox
        size={24}
        className="mb-3 text-slate-500"
      />

      <p className="text-sm font-medium text-slate-300">
        {title}
      </p>

      <p className="mt-1 max-w-md text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}