import { describe, it, expect } from "vitest";
import { buildComponent } from "../build-registry";

describe("buildComponent (command-palette)", () => {
  const item = buildComponent("command-palette");

  it("uses the shadcn registry-item schema", () => {
    expect(item.$schema).toContain("registry-item.json");
    expect(item.name).toBe("command-palette");
    expect(item.type).toBe("registry:ui");
  });

  it("declares framer-motion as a dependency", () => {
    expect(item.dependencies).toContain("framer-motion");
  });

  it("declares @tanstack/react-virtual as a dependency", () => {
    expect(item.dependencies).toContain("@tanstack/react-virtual");
  });

  it("includes all six source files with targets, excluding the barrel", () => {
    const paths = item.files.map((f) => f.path).sort();
    expect(paths).toEqual([
      "command-palette/command-list.tsx",
      "command-palette/command-palette.tsx",
      "command-palette/fuzzy.ts",
      "command-palette/motion.ts",
      "command-palette/types.ts",
      "command-palette/use-command-palette.ts",
    ]);
    for (const f of item.files) {
      expect(f.target).toBe(`components/${f.path}`);
      expect(f.content.length).toBeGreaterThan(0);
    }
  });

  it("classifies the hook and view file types correctly", () => {
    const hook = item.files.find((f) => f.path.endsWith("use-command-palette.ts"));
    const view = item.files.find((f) => f.path.endsWith("command-palette.tsx"));
    const list = item.files.find((f) => f.path.endsWith("command-list.tsx"));
    expect(hook!.type).toBe("registry:hook");
    expect(view!.type).toBe("registry:ui");
    expect(list!.type).toBe("registry:ui");
  });
});
