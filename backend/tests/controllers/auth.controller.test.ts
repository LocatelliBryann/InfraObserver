import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { AuthController } from "../../src/controllers/auth.controller";
import { InvalidCredentialsError } from "../../src/services/auth.service";

const user = {
  id: 1,
  email: "admin@infraobserver.com.br",
  name: "Admin",
  role: "ADMIN",
};

function createResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };

  res.status.mockReturnValue(res);

  return res;
}

function createLog() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

const validBody = {
  email: "Admin@InfraObserver.com.br",
  password: "senha-correta-123",
};

describe("AuthController", () => {
  it("should set an httpOnly strict cookie on successful login", async () => {
    const service = {
      login: vi.fn().mockResolvedValue({ token: "jwt-token", user }),
    };
    const controller = new AuthController(service, createLog());
    const res = createResponse();

    await controller.login(
      { body: validBody } as Request,
      res as unknown as Response,
    );

    expect(service.login).toHaveBeenCalledWith({
      email: "admin@infraobserver.com.br",
      password: "senha-correta-123",
    });
    expect(res.cookie).toHaveBeenCalledWith(
      "infraobserver_session",
      "jwt-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user });
  });

  it("should return 400 for an invalid payload", async () => {
    const service = { login: vi.fn() };
    const controller = new AuthController(service, createLog());
    const res = createResponse();

    await controller.login(
      { body: { email: "não é e-mail" } } as Request,
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(service.login).not.toHaveBeenCalled();
  });

  it("should return 401 and log invalid credentials without the password", async () => {
    const service = {
      login: vi.fn().mockRejectedValue(new InvalidCredentialsError()),
    };
    const log = createLog();
    const controller = new AuthController(service, log);
    const res = createResponse();

    await controller.login(
      { body: validBody } as Request,
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(
      { email: "admin@infraobserver.com.br" },
      "Failed login attempt",
    );
  });

  it("should return 500 for unexpected errors", async () => {
    const service = {
      login: vi.fn().mockRejectedValue(new Error("db down")),
    };
    const log = createLog();
    const controller = new AuthController(service, log);
    const res = createResponse();

    await controller.login(
      { body: validBody } as Request,
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(log.error).toHaveBeenCalledTimes(1);
  });

  it("should clear the session cookie on logout", () => {
    const controller = new AuthController({ login: vi.fn() }, createLog());
    const res = createResponse();

    controller.logout({} as Request, res as unknown as Response);

    expect(res.clearCookie).toHaveBeenCalledWith(
      "infraobserver_session",
      expect.objectContaining({ httpOnly: true, sameSite: "strict" }),
    );
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it("should return the logged user", () => {
    const controller = new AuthController({ login: vi.fn() }, createLog());
    const res = createResponse();

    controller.me({ user } as Request, res as unknown as Response);

    expect(res.json).toHaveBeenCalledWith({ user });
  });
});
