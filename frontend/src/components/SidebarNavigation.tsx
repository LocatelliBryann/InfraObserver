import {
  Activity,
  BellRing,
  ChartLine,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  Users,
} from "lucide-react";

interface SidebarNavigationProps {
  collapsed: boolean;
  onToggle: () => void;
  activeItem?: "dashboard";
}

const navigationItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "Endpoints",
    icon: Server,
    active: false,
  },
  {
    label: "Métricas",
    icon: ChartLine,
    active: false,
  },
  {
    label: "Alertas",
    icon: BellRing,
    active: false,
  },
  {
    label: "Eventos",
    icon: Activity,
    active: false,
  },
  {
    label: "Clientes",
    icon: Users,
    active: false,
  },
];

export function SidebarNavigation({
  collapsed,
  onToggle,
  activeItem = "dashboard",
}: SidebarNavigationProps) {
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

      <nav
        className={`space-y-2 transition-all duration-300 ${
          collapsed ? "items-center" : ""
        }`}
        aria-label="Navegação principal"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            item.label.toLowerCase() === activeItem;

          return (
            <div
              key={item.label}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center rounded-xl px-3 py-3 transition-all duration-300 ${
                collapsed
                  ? "justify-center"
                  : "justify-between"
              } ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              }`}
              aria-current={isActive ? "page" : undefined}
              aria-disabled={!item.active}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={19}
                  className="shrink-0 transition-transform duration-300 group-hover:scale-110"
                />

                {!collapsed && (
                  <span className="whitespace-nowrap text-sm font-medium">
                    {item.label}
                  </span>
                )}
              </div>

              {!collapsed && !item.active && (
                <span className="text-[9px] uppercase tracking-wide text-slate-600">
                  Em breve
                </span>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}