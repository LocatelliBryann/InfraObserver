import { Wifi } from "lucide-react";

interface PlatformStatusProps {
  status: string;
  description: string;
}

export function PlatformStatus({
  status,
  description,
}: PlatformStatusProps) {
  return (
    <div className="mt-10 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-emerald-400">
        <Wifi size={16} />

        <span className="text-xs font-semibold uppercase tracking-wide">
          Status da plataforma
        </span>
      </div>

      <p className="text-sm text-slate-300">
        {status}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}