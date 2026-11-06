import { useEffect, useState } from "react";

// Faixa horizontal da tela usada para decidir qual seção está "ativa":
// a seção que cruza a linha a ~30% do topo da janela.
const OBSERVER_ROOT_MARGIN = "-30% 0px -65% 0px";
const BOTTOM_TOLERANCE_PX = 4;

function sectionFromHash(sectionIds: readonly string[]): string | null {
  const hash = globalThis.location?.hash.replace("#", "") ?? "";

  return sectionIds.includes(hash) ? hash : null;
}

// Retorna o id da seção visível, para destacar o item da barra lateral.
export function useActiveSection(sectionIds: readonly string[]) {
  const [activeSection, setActiveSection] = useState<string>(
    () => sectionFromHash(sectionIds) ?? sectionIds[0] ?? "",
  );

  useEffect(() => {
    const handleHashChange = () => {
      const section = sectionFromHash(sectionIds);

      if (section) {
        setActiveSection(section);
      }
    };

    globalThis.addEventListener("hashchange", handleHashChange);

    return () => {
      globalThis.removeEventListener("hashchange", handleHashChange);
    };
  }, [sectionIds]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);

        if (visible) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: OBSERVER_ROOT_MARGIN },
    );

    for (const id of sectionIds) {
      const element = document.getElementById(id);

      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [sectionIds]);

  useEffect(() => {
    // A última seção pode ser curta demais para chegar à faixa de referência:
    // no fim da página, ela é a ativa.
    const handleScroll = () => {
      const lastSection = sectionIds[sectionIds.length - 1];
      const reachedBottom =
        globalThis.innerHeight + globalThis.scrollY >=
        document.documentElement.scrollHeight - BOTTOM_TOLERANCE_PX;

      if (lastSection && reachedBottom) {
        setActiveSection(lastSection);
      }
    };

    globalThis.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      globalThis.removeEventListener("scroll", handleScroll);
    };
  }, [sectionIds]);

  return { activeSection, setActiveSection };
}
