import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { createRequireAuth } from "../../src/middlewares/require-auth.middleware";

const user = {
  id: 1,
  email: "admin@infraobserver.com.br",
  name: "Admin",
  role: "ADMIN",
};

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function createLog() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function run(
  verifySession: ReturnType<typeof vi.fn>,
  cookies: Record<string, string> | undefined,
) {
  const middleware = createRequireAuth({ verifySession }, createLog());
  const req = { cookies } as unknown as Request;
  const res = createResponse();
  const next = vi.fn() as NextFunction;

  return { req, res, next, done: middleware(req, res as unknown as Response, next) };
}

describe("requireAuth middleware", () => {
  it("should return 401 without the session cookie", async () => {
    const verifySession = vi.fn();
    const { res, next, done } = run(verifySession, {});

    await done;

    expect(res.status).toHaveBeenCalledWith(401);
    expect(verifySession).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when the cookie parser did not run", async () => {
    const { res, done } = run(vi.fn(), undefined);

    await done;

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 for an invalid or expired session", async () => {
    const { res, next, done } = run(vi.fn().mockResolvedValue(null), {
      infraobserver_session: "token",
    });

    await done;

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Session expired or invalid",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should attach the user and continue for a valid session", async () => {
    const { req, next, done } = run(vi.fn().mockResolvedValue(user), {
      infraobserver_session: "token",
    });

    await done;

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should return 500 when the session cannot be verified", async () => {
    const { res, done } = run(vi.fn().mockRejectedValue(new Error("db")), {
      infraobserver_session: "token",
    });

    await done;

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
