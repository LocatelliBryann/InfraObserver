import type {
  EndpointHealth,
  EndpointStatus,
} from "../services/endpointHealthService";

interface EndpointStatusListProps {
  health: EndpointHealth[];
  activeEndpointId: number | null;
  onSelect: (endpointId: number) => void;
}

const STATUS_STYLES: Record<
  EndpointStatus,
  { label: string; dot: string; badge: string }
> = {
  ONLINE: {
    label: "Online",
    dot: "bg-emerald-400",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  ALERT: {
    label: "Alerta",
    dot: "bg-amber-400",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  OFFLINE: {
    label: "Offline",
    dot: "bg-rose-400",
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  },
};

// RF06: lista de endpoints com indicador de status (online, alerta, offline).
export function EndpointStatusList({
  health,
  activeEndpointId,
  onSelect,
}: EndpointStatusListProps) {
  if (health.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label="Status dos endpoints"
      className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {health.map((item) => {
        const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.OFFLINE;
        const isActive = item.endpointId === activeEndpointId;

        return (
          <li key={item.endpointId} className="min-w-0">
            <button
              type="button"
              onClick={() => onSelect(item.endpointId)}
              aria-pressed={isActive}
              className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                isActive
                  ? "border-cyan-500/60 bg-cyan-500/5"
                  : "border-slate-800 bg-slate-900 hover:border-slate-700"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                />
                <span className="truncate text-sm font-medium text-slate-100">
                  {item.hostname}
                </span>
              </span>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}
              >
                {style.label}
                {item.status === "ALERT" && item.activeAlerts > 0
                  ? ` · ${item.activeAlerts}`
                  : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
