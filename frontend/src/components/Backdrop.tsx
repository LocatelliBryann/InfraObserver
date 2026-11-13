/**
 * Fundo da aplicação: grade de pontos e três luzes difusas que se movem
 * devagar (paradas para quem pediu menos movimento). Só decoração.
 */
export function Backdrop() {
  return (
    <div className="io-backdrop" aria-hidden="true">
      <div className="io-aurora io-aurora--signal" />
      <div className="io-aurora io-aurora--teal" />
      <div className="io-aurora io-aurora--sky" />
    </div>
  );
}
