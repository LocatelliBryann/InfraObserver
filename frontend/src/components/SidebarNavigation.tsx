import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import {
  NAVIGATION_ITEMS,
  NAVIGATION_SECTION_IDS,
  type NavigationItem,
} from "../config/navigation";
import { useActiveSection } from "../hooks/useActiveSection";

interface SidebarNavigationProps {
  collapsed: boolean;
  onToggle: () => void;
  // Itens do menu; o padrão é o menu do dashboard.
  items?: NavigationItem[];
}

const itemLayout = "group flex items-center rounded-xl px-3 py-3 transition-all duration-300";

export function SidebarNavigation({
  collapsed,
  onToggle,
  items = NAVIGATION_ITEMS,
}: SidebarNavigationProps) {
  const { activeSection, setActiveSection } = useActiveSection(
    NAVIGATION_SECTION_IDS,
  );

  return (
    <div className="space-y-5">
      <div
        className={`flex items-center ${
          collapsed ? "justify-center" : "justify-end"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            collapsed
              ? "Expandir menu lateral"
              : "Minimizar menu lateral"
          }
          aria-expanded={!collapsed}
          title={
            collapsed
              ? "Expandir menu"
              : "Minimizar menu"
          }
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/60 text-slate-400 transition-all duration-200 hover:border-cyan-500/60 hover:bg-cyan-500/10 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>
      </div>

      <nav aria-label="Navegação principal">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label}>
              {item.sectionId ? (
                <SectionLink
                  item={item}
                  sectionId={item.sectionId}
                  collapsed={collapsed}
                  active={activeSection === item.sectionId}
                  onSelect={setActiveSection}
                />
              ) : (
                <ComingSoonItem item={item} collapsed={collapsed} />
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

interface SectionLinkProps {
  item: NavigationItem;
  sectionId: string;
  collapsed: boolean;
  active: boolean;
  onSelect: (sectionId: string) => void;
}

function SectionLink({
  item,
  sectionId,
  collapsed,
  active,
  onSelect,
}: SectionLinkProps) {
  const Icon = item.icon;

  return (
    <a
      href={`#${sectionId}`}
      onClick={() => onSelect(sectionId)}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "location" : undefined}
      className={`${itemLayout} gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
        collapsed ? "justify-center" : ""
      } ${
        active
          ? "bg-cyan-500/10 text-cyan-400"
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      }`}
    >
      <Icon
        size={19}
        aria-hidden="true"
        className="shrink-0 transition-transform duration-300 group-hover:scale-110"
      />

      {!collapsed && (
        <span className="whitespace-nowrap text-sm font-medium">
          {item.label}
        </span>
      )}
    </a>
  );
}

interface ComingSoonItemProps {
  item: NavigationItem;
  collapsed: boolean;
}

// Funcionalidade ainda não disponível: visível, mas sem link, sem efeito de
// hover e anunciada como desabilitada para leitores de tela.
function ComingSoonItem({ item, collapsed }: ComingSoonItemProps) {
  const Icon = item.icon;
  const description =
    item.comingSoonDescription ?? `${item.label} (em breve)`;

  return (
    <span
      aria-disabled="true"
      title={description}
      aria-label={collapsed ? description : undefined}
      className={`${itemLayout} cursor-not-allowed text-slate-600 ${
        collapsed ? "justify-center" : "justify-between"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon size={19} aria-hidden="true" className="shrink-0" />

        {!collapsed && (
          <span className="whitespace-nowrap text-sm font-medium">
            {item.label}
          </span>
        )}
      </span>

      {!collapsed && (
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] uppercase tracking-wide text-slate-500">
          Em breve
        </span>
      )}
    </span>
  );
}
