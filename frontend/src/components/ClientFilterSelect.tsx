import { Building2 } from "lucide-react";

import {
  CLIENT_FILTER_NONE,
  type ClientFilter,
} from "../services/clientFilter";
import type { Client } from "../services/clientsService";

const ALL_VALUE = "";

interface ClientFilterSelectProps {
  clients: Client[];
  value: ClientFilter | undefined;
  onChange: (filter: ClientFilter | undefined) => void;
}

// Seletor do topo do dashboard: todos os PCs, os de um cliente ou os sem cliente.
export function ClientFilterSelect({
  clients,
  value,
  onChange,
}: ClientFilterSelectProps) {
  const selected = value === undefined ? ALL_VALUE : String(value);

  function handleChange(raw: string) {
    if (raw === ALL_VALUE) {
      onChange(undefined);
      return;
    }

    onChange(raw === CLIENT_FILTER_NONE ? CLIENT_FILTER_NONE : Number(raw));
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 size={16} className="shrink-0 text-slate-500" aria-hidden="true" />

      <label htmlFor="client-filter" className="text-sm text-slate-400">
        Cliente
      </label>

      <select
        id="client-filter"
        value={selected}
        onChange={(event) => handleChange(event.target.value)}
        className="min-w-0 max-w-64 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-500"
      >
        <option value={ALL_VALUE}>Todos os clientes</option>

        {clients.map((client) => (
          <option key={client.id} value={String(client.id)}>
            {client.name}
          </option>
        ))}

        <option value={CLIENT_FILTER_NONE}>Sem cliente</option>
      </select>
    </div>
  );
}
