interface BrandMarkProps {
  /** Largura e altura em pixels. */
  size?: number;
  /** Texto alternativo. Sem ele, o símbolo é tratado como decorativo. */
  title?: string;
  className?: string;
}

/**
 * Símbolo do InfraObserver: anel aberto (a observação) com o ponto verde
 * de sinal na abertura (o endpoint online). O anel usa a cor do texto
 * (`currentColor`), então acompanha o tema de quem o usa.
 */
export function BrandMark({ size = 32, title, className }: BrandMarkProps) {
  const decorative = !title;

  return (
    <svg
      width={size}
      height={size}
      viewBox="8 8 48 48"
      className={className}
      role={decorative ? undefined : "img"}
      aria-label={title}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      <path
        d="M 50.79 25.16 A 20 20 0 1 1 35.47 12.30"
        fill="none"
        stroke="currentColor"
        strokeWidth={7}
      />
      <circle cx={44.86} cy={16.68} r={4.5} fill="#1FA971" />
    </svg>
  );
}
