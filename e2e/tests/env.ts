// Configuração lida do ambiente (o workflow E2E define estes valores).
export const API_URL = (process.env.E2E_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export function adminCredentials() {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD");
  }

  return { email, password };
}

// Nome do PC que o global-setup registra pela API, como um agente faria.
export const SEEDED_HOSTNAME = "E2E-PC-01";
// Definido pelo global-setup: o cliente do PC registrado.
export function seededClientId(): string {
  const clientId = process.env.E2E_SEEDED_CLIENT_ID;

  if (!clientId) {
    throw new Error("O global-setup não registrou o cliente de teste");
  }

  return clientId;
}

export const SEEDED_FILE = "C:\\Users\\e2e\\Documents\\contrato-e2e.docx";
