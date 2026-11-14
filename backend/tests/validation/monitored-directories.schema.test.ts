import { describe, expect, it } from "vitest";

import {
  clientDirectoriesSchema,
  directoriesReportSchema,
  endpointDirectoriesSchema,
  normalizeDirectory,
} from "../../src/utils/validation/monitored-directories.schema";

describe("endpointDirectoriesSchema", () => {
  const parse = (directories: unknown[]) =>
    endpointDirectoriesSchema.safeParse({ mode: "custom", directories });

  it("should accept drive and network paths", () => {
    const result = parse(["C:\\Dados", "D:\\", "\\\\servidor\\escrituras\\2026"]);

    expect(result.success).toBe(true);
    expect(result.data?.directories).toEqual([
      "C:\\Dados",
      "D:\\",
      "\\\\servidor\\escrituras\\2026",
    ]);
  });

  it("should accept an empty list (no folders, only metrics)", () => {
    expect(parse([]).data).toEqual({ mode: "custom", directories: [] });
  });

  it("should drop the list when the PC follows its client", () => {
    expect(
      endpointDirectoriesSchema.safeParse({ mode: "inherit", directories: ["C:\\Dados"] })
        .data,
    ).toEqual({ mode: "inherit", directories: [] });
  });

  it("should require a known mode", () => {
    expect(endpointDirectoriesSchema.safeParse({ mode: "client" }).success).toBe(false);
    expect(endpointDirectoriesSchema.safeParse({ directories: [] }).success).toBe(false);
  });

  it("should trim spaces and trailing backslashes", () => {
    expect(parse(["  C:\\Dados\\Matriculas\\  "]).data?.directories).toEqual([
      "C:\\Dados\\Matriculas",
    ]);
  });

  it("should drop repeated folders, ignoring case like Windows does", () => {
    expect(parse(["C:\\Dados", "c:\\dados\\", "C:\\Outros"]).data?.directories).toEqual([
      "C:\\Dados",
      "C:\\Outros",
    ]);
  });

  it.each([
    ["relative path", "Dados\\Matriculas"],
    ["Linux path", "/home/usuario"],
    ["forbidden character", "C:\\Dados\\a?b"],
    ["second colon", "C:\\Dados\\x:y"],
    ["control character", "C:\\Dados\\\u0007"],
    ["empty", "   "],
    ["too long", `C:\\${"a".repeat(260)}`],
  ])("should reject a %s", (_case, path) => {
    expect(parse([path]).success).toBe(false);
  });

  it("should reject more than 20 folders", () => {
    const paths = Array.from({ length: 21 }, (_, index) => `C:\\Pasta${index}`);

    expect(parse(paths).success).toBe(false);
  });

  it("should use an empty list when none is sent", () => {
    expect(endpointDirectoriesSchema.safeParse({ mode: "custom" }).data).toEqual({
      mode: "custom",
      directories: [],
    });
  });
});

describe("clientDirectoriesSchema", () => {
  it("should accept the client list with the same rules", () => {
    expect(
      clientDirectoriesSchema.safeParse({
        mode: "custom",
        directories: ["\\\\servidor\\escrituras\\", "\\\\SERVIDOR\\escrituras"],
      }).data,
    ).toEqual({ mode: "custom", directories: ["\\\\servidor\\escrituras"] });
  });

  it("should drop the list when each PC uses its installation folders", () => {
    expect(
      clientDirectoriesSchema.safeParse({ mode: "installation", directories: ["C:\\x"] }).data,
    ).toEqual({ mode: "installation", directories: [] });
  });

  it("should reject an unknown mode or an invalid path", () => {
    expect(clientDirectoriesSchema.safeParse({ mode: "inherit" }).success).toBe(false);
    expect(
      clientDirectoriesSchema.safeParse({ mode: "custom", directories: ["R:dados"] }).success,
    ).toBe(false);
  });
});

describe("normalizeDirectory", () => {
  it("should keep the root of a drive", () => {
    expect(normalizeDirectory("C:\\")).toBe("C:\\");
  });

  it("should remove trailing backslashes from folders", () => {
    expect(normalizeDirectory("C:\\Dados\\\\")).toBe("C:\\Dados");
  });
});

describe("directoriesReportSchema", () => {
  it("should accept what the agent reports", () => {
    const result = directoriesReportSchema.safeParse({
      monitoredDirectories: ["C:\\Users\\ana\\Documents", "/tmp/teste"],
      missingDirectories: ["D:\\Removida"],
    });

    expect(result.success).toBe(true);
  });

  it("should reject too many folders or non-text values", () => {
    expect(
      directoriesReportSchema.safeParse({
        monitoredDirectories: Array(51).fill("C:\\x"),
        missingDirectories: [],
      }).success,
    ).toBe(false);
    expect(
      directoriesReportSchema.safeParse({
        monitoredDirectories: [123],
        missingDirectories: [],
      }).success,
    ).toBe(false);
  });
});
