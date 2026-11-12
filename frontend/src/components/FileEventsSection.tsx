import { useEffect, useState } from "react";

import {
  Activity,
  ArrowRight,
  FilePenLine,
  FilePlus2,
  Folder,
  FolderInput,
  Globe,
  PenLine,
  Search,
  ShieldCheck,
  SquareTerminal,
  Trash2,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "./EmptyState";

import { DASHBOARD_SECTIONS } from "../config/navigation";
import {
  FILE_EVENT_TYPES,
  type FileEvent,
  type FileEventFilters,
  type FileEventType,
} from "../services/fileEventsService";

// Espera o usuário parar de digitar antes de buscar na API.
const SEARCH_DEBOUNCE_MS = 400;

interface EventTypeStyle {
  label: string;
  icon: LucideIcon;
  className: string;
}

export const EVENT_TYPE_STYLES: Record<FileEventType, EventTypeStyle> = {
  CREATE: {
    label: "Criado",
    icon: FilePlus2,
    className: "bg-emerald-500/10 text-emerald-400",
  },
  MODIFY: {
    label: "Modificado",
    icon: FilePenLine,
    className: "bg-sky-500/10 text-sky-400",
  },
  DELETE: {
    label: "Excluído",
    icon: Trash2,
    className: "bg-red-500/10 text-red-400",
  },
  RENAME: {
    label: "Renomeado",
    icon: PenLine,
    className: "bg-amber-500/10 text-amber-400",
  },
  MOVE: {
    label: "Movido",
    icon: FolderInput,
    className: "bg-violet-500/10 text-violet-400",
  },
};

// Eventos de agentes antigos podem trazer um tipo que a tela não conhece.
function styleFor(type: string): EventTypeStyle {
  return (
    EVENT_TYPE_STYLES[type as FileEventType] ?? {
      label: type,
      icon: Activity,
      className: "bg-slate-500/10 text-slate-400",
    }
  );
}

interface FileEventsSectionProps {
  events: FileEvent[];
  loading: boolean;
  error: string | null;
  hostname?: string;
  filters: FileEventFilters;
  onFiltersChange: (filters: FileEventFilters) => void;
}

export function FileEventsSection({
  events,
  loading,
  error,
  hostname,
  filters,
  onFiltersChange,
}: FileEventsSectionProps) {
  const [searchText, setSearchText] = useState(filters.search);

  useEffect(() => {
    if (searchText === filters.search) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onFiltersChange({ ...filters, search: searchText });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchText, filters, onFiltersChange]);

  const hasFilters = filters.eventTypes.length > 0 || filters.search !== "";

  function toggleType(type: FileEventType) {
    const selected = filters.eventTypes.includes(type)
      ? filters.eventTypes.filter((item) => item !== type)
      : [...filters.eventTypes, type];

    onFiltersChange({ ...filters, eventTypes: selected });
  }

  function clearFilters() {
    setSearchText("");
    onFiltersChange({ eventTypes: [], search: "" });
  }

  return (
    <section
      id={DASHBOARD_SECTIONS.events}
      aria-labelledby="activity-heading"
      className="min-w-0 scroll-mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="shrink-0 rounded-xl bg-violet-500/10 p-3 text-violet-400">
          <Activity size={21} />
        </div>

        <div className="min-w-0">
          <h3 id="activity-heading" className="font-semibold">
            Atividade recente
          </h3>

          <p className="text-sm text-slate-400">
            {hostname
              ? `Eventos de arquivos e pastas detectados em ${hostname}.`
              : "Eventos e alterações detectadas nos endpoints."}
          </p>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div
          role="group"
          aria-label="Filtrar por tipo de evento"
          className="flex flex-wrap gap-2"
        >
          <FilterChip
            label="Todos"
            pressed={filters.eventTypes.length === 0}
            onClick={() => onFiltersChange({ ...filters, eventTypes: [] })}
          />

          {FILE_EVENT_TYPES.map((type) => (
            <FilterChip
              key={type}
              label={EVENT_TYPE_STYLES[type].label}
              pressed={filters.eventTypes.includes(type)}
              onClick={() => toggleType(type)}
            />
          ))}
        </div>

        <div className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            aria-label="Buscar por arquivo, pasta ou usuário"
            placeholder="Buscar por arquivo, pasta, usuário, programa ou IP"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-9 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-500 [&::-webkit-search-cancel-button]:appearance-none"
          />

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              aria-label="Limpar filtros"
              title="Limpar filtros"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {loading && events.length === 0 ? (
        <Message>Carregando atividades recentes...</Message>
      ) : error ? (
        <Message error>Não foi possível carregar as atividades recentes.</Message>
      ) : events.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="Nenhum evento encontrado"
            description="Nenhuma atividade corresponde aos filtros escolhidos."
          />
        ) : (
          <EmptyState
            title="Nenhuma atividade registrada"
            description="Os eventos detectados nos endpoints aparecerão nesta seção."
          />
        )
      ) : (
        <ul className="min-w-0 space-y-3">
          {events.map((event) => (
            <FileEventItem key={event.id} event={event} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FileEventItem({ event }: { event: FileEvent }) {
  const style = styleFor(event.eventType);
  const Icon = style.icon;
  const hasOrigin =
    Boolean(event.previousPath) &&
    (event.eventType === "RENAME" || event.eventType === "MOVE");

  return (
    <li className="min-w-0 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.className}`}
          >
            <Icon size={16} aria-hidden="true" />
          </span>

          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-100">
              {style.label}

              {event.isDirectory && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  <Folder size={10} aria-hidden="true" />
                  Pasta
                </span>
              )}
            </p>

            <p className="mt-0.5 break-words text-xs text-slate-500">
              {event.endpoint.hostname}
            </p>
          </div>
        </div>

        <time
          dateTime={event.occurredAt}
          className="shrink-0 text-xs text-slate-500"
        >
          {new Date(event.occurredAt).toLocaleString("pt-BR")}
        </time>
      </div>

      {hasOrigin ? (
        <div className="mt-3 space-y-1 text-xs">
          <p className="break-all text-slate-500">
            <span className="text-slate-600">De </span>
            {event.previousPath}
          </p>
          <p className="flex gap-1 break-all text-slate-300">
            <ArrowRight
              size={12}
              aria-label="para"
              className="mt-0.5 shrink-0 text-slate-500"
            />
            {event.filePath}
          </p>
        </div>
      ) : (
        <p className="mt-3 break-all text-xs text-slate-300">{event.filePath}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <User size={12} aria-hidden="true" />
          {event.username}
        </span>

        {event.processName && (
          <span className="inline-flex items-center gap-1">
            <SquareTerminal size={12} aria-hidden="true" />
            via {event.processName}
          </span>
        )}

        {event.sourceIp && (
          <span className="inline-flex items-center gap-1">
            <Globe size={12} aria-hidden="true" />
            Origem {event.sourceIp}
          </span>
        )}

        {event.audited ? (
          <span
            className="inline-flex items-center gap-1 text-emerald-400"
            title="Usuário, programa e IP confirmados pela auditoria do Windows"
          >
            <ShieldCheck size={12} aria-hidden="true" />
            Auditado
          </span>
        ) : (
          <span
            className="text-slate-600"
            title="Usuário com sessão aberta no computador na hora do evento (sem auditoria do Windows)"
          >
            Usuário da sessão
          </span>
        )}
      </div>
    </li>
  );
}

interface FilterChipProps {
  label: string;
  pressed: boolean;
  onClick: () => void;
}

function FilterChip({ label, pressed, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
        pressed
          ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300"
          : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function Message({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`flex min-h-40 min-w-0 items-center justify-center rounded-2xl border p-6 text-sm ${
        error
          ? "border-red-900/50 text-red-400"
          : "border-slate-800 text-slate-400"
      }`}
    >
      {children}
    </div>
  );
}
