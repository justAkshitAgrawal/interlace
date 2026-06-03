import { readFileSync, readdirSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// NOTE: use dirname(fileURLToPath(import.meta.url)) rather than
// fileURLToPath(new URL(".", import.meta.url)) — Vite (vitest) rewrites the
// `new URL(..., import.meta.url)` pattern to a dev-server http:// URL, which
// breaks fileURLToPath when the module is imported under test.
const here = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = join(here, "..", "components", "src");
const OUT_DIR = join(here, "..", "..", "apps", "showcase", "public", "r");

/** Map a source filename to its shadcn registry file `type`. */
function fileType(name: string): string {
  if (name.startsWith("use-")) return "registry:hook";
  if (name.endsWith(".tsx")) return "registry:ui";
  return "registry:lib";
}

/** External runtime deps a component needs (kept explicit, not parsed). */
const DEPENDENCIES: Record<string, string[]> = {
  "command-palette": ["framer-motion"],
};

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => {
      const full = join(dir, f);
      if (!statSync(full).isFile()) return false;
      if (f === "index.ts") return false; // barrel is for the monorepo, not consumers
      return f.endsWith(".ts") || f.endsWith(".tsx");
    })
    .sort();
}

export function buildComponent(name: string) {
  const dir = join(COMPONENTS_DIR, name);
  const files = listSourceFiles(dir).map((file) => ({
    path: `${name}/${file}`,
    content: readFileSync(join(dir, file), "utf8"),
    type: fileType(file),
    target: `components/${name}/${file}`,
  }));

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:ui",
    dependencies: DEPENDENCIES[name] ?? [],
    registryDependencies: [],
    files,
  };
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const components = readdirSync(COMPONENTS_DIR).filter((f) =>
    statSync(join(COMPONENTS_DIR, f)).isDirectory(),
  );
  for (const name of components) {
    const item = buildComponent(name);
    const outFile = join(OUT_DIR, `${name}.json`);
    writeFileSync(outFile, JSON.stringify(item, null, 2));
    console.log(`wrote ${relative(process.cwd(), outFile)} (${item.files.length} files)`);
  }
}

// Only run when invoked directly (not when imported by tests).
// pathToFileURL percent-encodes spaces / non-ASCII so this matches even on
// paths a naive `file://${process.argv[1]}` concat would miss.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
