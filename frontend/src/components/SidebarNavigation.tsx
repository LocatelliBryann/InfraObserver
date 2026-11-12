import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link, useLocation } from "react-router";

import {
  NAVIGATION_ITEMS,
  NAVIGATION_SECTION_IDS,
  ROUTES,
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
  const { pathname } = useLocation();
  const onDashboard = pathname === ROUTES.dashboard;

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
              {item.path ? (
                <NavigationLink
                  item={item}
                  to={item.path}
                  collapsed={collapsed}
                  active={pathname === item.path}
                />
              ) : item.sectionId ? (
                <SectionLink
                  item={item}
                  sectionId={item.sectionId}
                  collapsed={collapsed}
                  active={onDashboard && activeSection === item.sectionId}
                  onDashboard={onDashboard}
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

function linkClassName(collapsed: boolean, active: boolean): string {
  return `${itemLayout} gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
    collapsed ? "justify-center" : ""
  } ${
    active
      ? "bg-cyan-500/10 text-cyan-400"
      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
  }`;
}

function LinkContent({ item, collapsed }: { item: NavigationItem; collapsed: boolean }) {
  const Icon = item.icon;

  return (
    <>
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
    </>
  );
}

interface SectionLinkProps {
  item: NavigationItem;
  sectionId: string;
  collapsed: boolean;
  active: boolean;
  onDashboard: boolean;
  onSelect: (sectionId: string) => void;
}

// Seção do dashboard. No próprio dashboard é uma âncora (mantém o filtro
// de cliente da URL); em outra página, volta para o dashboard naquela seção.
function SectionLink({
  item,
  sectionId,
  collapsed,
  active,
  onDashboard,
  onSelect,
}: SectionLinkProps) {
  const common = {
    title: collapsed ? item.label : undefined,
    "aria-label": collapsed ? item.label : undefined,
    "aria-current": active ? ("location" as const) : undefined,
    className: linkClassName(collapsed, active),
  };

  if (!onDashboard) {
    return (
      <Link to={`${ROUTES.dashboard}#${sectionId}`} {...common}>
        <LinkContent item={item} collapsed={collapsed} />
      </Link>
    );
  }

  return (
    <a href={`#${sectionId}`} onClick={() => onSelect(sectionId)} {...common}>
      <LinkContent item={item} collapsed={collapsed} />
    </a>
  );
}

interface NavigationLinkProps {
  item: NavigationItem;
  to: string;
  collapsed: boolean;
  active: boolean;
}

// Página própria (ex.: Clientes).
function NavigationLink({ item, to, collapsed, active }: NavigationLinkProps) {
  return (
    <Link
      to={to}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={linkClassName(collapsed, active)}
    >
      <LinkContent item={item} collapsed={collapsed} />
    </Link>
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
