interface PlatformStatusProps {
  status: string;
  description: string;
}

export function PlatformStatus({
  status,
  description,
}: PlatformStatusProps) {
  return (
    <div className="mt-10 rounded-xl border border-slate-800 bg-slate-950/50 p-4 backdrop-blur">
      <div className="mb-2 flex items-center gap-2.5 text-emerald-400">
        <span aria-hidden="true" className="io-live" />

        <span className="text-xs font-semibold">
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