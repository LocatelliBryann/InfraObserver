import { describe, expect, it } from "vitest";

import {
  clientFilterQuery,
  clientFilterToUrlValue,
  parseClientFilter,
  withClientFilter,
} from "../../src/services/clientFilter";

describe("clientFilter", () => {
  it("lê o filtro da URL", () => {
    expect(parseClientFilter(null)).toBeUndefined();
    expect(parseClientFilter("")).toBeUndefined();
    expect(parseClientFilter("3")).toBe(3);
    expect(parseClientFilter("sem")).toBe("none");
    expect(parseClientFilter("0")).toBeUndefined();
    expect(parseClientFilter("-2")).toBeUndefined();
    expect(parseClientFilter("1.5")).toBeUndefined();
    expect(parseClientFilter("abc")).toBeUndefined();
  });

  it("escreve o filtro na URL", () => {
    expect(clientFilterToUrlValue(3)).toBe("3");
    expect(clientFilterToUrlValue("none")).toBe("sem");
  });

  it("monta o parâmetro da API", () => {
    expect(clientFilterQuery(undefined)).toBe("");
    expect(clientFilterQuery(3)).toBe("clientId=3");
    expect(clientFilterQuery("none")).toBe("clientId=none");
  });

  it("junta o filtro a caminhos com e sem parâmetros", () => {
    expect(withClientFilter("/api/v1/alerts", undefined)).toBe("/api/v1/alerts");
    expect(withClientFilter("/api/v1/alerts", 3)).toBe("/api/v1/alerts?clientId=3");
    expect(withClientFilter("/api/v1/alerts?status=resolved", "none")).toBe(
      "/api/v1/alerts?status=resolved&clientId=none",
    );
  });
});
