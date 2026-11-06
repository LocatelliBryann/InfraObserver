import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, onUnauthorized } from "../../src/services/apiClient";
import {
  getCurrentUser,
  login,
  loginErrorMessage,
  logout,
} from "../../src/services/authService";

const user = { id: 1, email: "admin@x.com", name: "Admin", role: "ADMIN" };

function mockFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("authService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should send credentials and return the user on login", async () => {
    const fetchMock = mockFetch(200, { user });

    await expect(login("admin@x.com", "senha")).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/login"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "admin@x.com", password: "senha" }),
      }),
    );
  });

  it("should accept the empty 204 response on logout", async () => {
    mockFetch(204);

    await expect(logout()).resolves.toBeUndefined();
  });

  it("should return the current user or null without a session", async () => {
    mockFetch(200, { user });
    await expect(getCurrentUser()).resolves.toEqual(user);

    mockFetch(401);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("should rethrow other errors when loading the session", async () => {
    mockFetch(500);

    await expect(getCurrentUser()).rejects.toBeInstanceOf(ApiError);
  });

  it("should notify listeners when the API answers 401", async () => {
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    mockFetch(401);

    await getCurrentUser();
    unsubscribe();
    await getCurrentUser();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should translate login errors to friendly messages", () => {
    expect(loginErrorMessage(new ApiError(401))).toBe("E-mail ou senha incorretos.");
    expect(loginErrorMessage(new ApiError(429))).toContain("Muitas tentativas");
    expect(loginErrorMessage(new ApiError(400))).toContain("e-mail válido");
    expect(loginErrorMessage(new Error("rede"))).toContain("Não foi possível entrar");
  });
});
