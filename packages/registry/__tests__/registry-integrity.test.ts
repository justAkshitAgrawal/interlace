import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const OUT = join(ROOT, "apps", "showcase", "public", "r", "command-palette.json");

describe("registry integrity: command-palette.json", () => {
  beforeAll(() => {
    // Regenerate to guarantee we test current source, not a stale artifact.
    execFileSync("pnpm", ["--filter", "@palettekit/registry", "registry"], {
      cwd: ROOT,
      stdio: "ignore",
    });
  });

  it("exists and is valid JSON", () => {
    expect(existsSync(OUT)).toBe(true);
    expect(() => JSON.parse(readFileSync(OUT, "utf8"))).not.toThrow();
  });

  it("matches the installable contract", () => {
    const item = JSON.parse(readFileSync(OUT, "utf8"));
    expect(item.name).toBe("command-palette");
    expect(Array.isArray(item.files)).toBe(true);
    const validTypes = new Set(["registry:ui", "registry:hook", "registry:lib"]);
    for (const f of item.files) {
      expect(typeof f.content).toBe("string");
      expect(f.content.length).toBeGreaterThan(0);
      expect(validTypes.has(f.type)).toBe(true);
      // targets must stay inside the consumer project (no path traversal).
      expect(f.target.startsWith("components/")).toBe(true);
      expect(f.target).not.toContain("..");
    }
  });

  it("ships every source file the component needs to compile", () => {
    const item = JSON.parse(readFileSync(OUT, "utf8"));
    const names = item.files.map((f: { path: string }) => f.path);
    for (const required of [
      "command-palette/types.ts",
      "command-palette/fuzzy.ts",
      "command-palette/motion.ts",
      "command-palette/use-command-palette.ts",
      "command-palette/command-palette.tsx",
    ]) {
      expect(names).toContain(required);
    }
  });

  it("does not ship the monorepo barrel (index.ts) to consumers", () => {
    const item = JSON.parse(readFileSync(OUT, "utf8"));
    const names = item.files.map((f: { path: string }) => f.path);
    expect(names).not.toContain("command-palette/index.ts");
  });
});
