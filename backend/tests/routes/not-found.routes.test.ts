import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app";

describe("Unknown routes", () => {
  it("should return 404 with a JSON body for an unknown API route", async () => {
    const response = await request(app).get("/api/v1/xyz");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual({
      error: "Rota não encontrada",
    });
  });

  it("should return 404 with a JSON body for an unknown method", async () => {
    const response = await request(app).delete("/health");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Rota não encontrada",
    });
  });
});
