/**
 * Brilho que acompanha o cursor nos painéis (.io-card): grava a posição do
 * mouse, relativa ao painel, nas variáveis CSS --mx e --my. Um único ouvinte
 * no documento atende todos os painéis, inclusive os que aparecem depois.
 */
export function installSpotlight(root: Document = document): () => void {
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const card = target.closest<HTMLElement>(".io-card");

    if (!card) {
      return;
    }

    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    card.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };

  root.addEventListener("pointermove", onPointerMove, { passive: true });

  return () => root.removeEventListener("pointermove", onPointerMove);
}
