import {
  Activity,
  BellRing,
  ChartLine,
  LayoutDashboard,
  Server,
  Users,
  type LucideIcon,
} from "lucide-react";

// Ids das seções do dashboard. A barra lateral leva até elas por âncora (#alertas)
// e destaca a que estiver visível na tela.
export const DASHBOARD_SECTIONS = {
  overview: "visao-geral",
  alerts: "alertas",
  metrics: "metricas",
  endpoints: "endpoints",
  events: "eventos",
} as const;

// Páginas do app (rotas). O dashboard fica em "/".
export const ROUTES = {
  dashboard: "/",
  clients: "/clientes",
} as const;

export type DashboardSectionId =
  (typeof DASHBOARD_SECTIONS)[keyof typeof DASHBOARD_SECTIONS];

export interface NavigationItem {
  label: string;
  icon: LucideIcon;
  // Seção do dashboard (âncora) ou página própria (rota).
  // Sem nenhum dos dois = funcionalidade ainda não disponível ("Em breve").
  sectionId?: DashboardSectionId;
  path?: string;
  comingSoonDescription?: string;
}

// Na mesma ordem em que as seções aparecem na página.
export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    sectionId: DASHBOARD_SECTIONS.overview,
  },
  {
    label: "Alertas",
    icon: BellRing,
    sectionId: DASHBOARD_SECTIONS.alerts,
  },
  {
    label: "Métricas",
    icon: ChartLine,
    sectionId: DASHBOARD_SECTIONS.metrics,
  },
  {
    label: "Endpoints",
    icon: Server,
    sectionId: DASHBOARD_SECTIONS.endpoints,
  },
  {
    label: "Eventos",
    icon: Activity,
    sectionId: DASHBOARD_SECTIONS.events,
  },
  {
    label: "Clientes",
    icon: Users,
    path: ROUTES.clients,
  },
];

export const NAVIGATION_SECTION_IDS: DashboardSectionId[] =
  NAVIGATION_ITEMS.flatMap((item) =>
    item.sectionId ? [item.sectionId] : [],
  );
