// Reports files under src/ that are unreachable from the entry point.
//   node scripts/deadcode.mjs
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, sep } from "node:path";

const SRC = resolve("src");
const EXTS = ["", ".jsx", ".js", ".json"];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(jsx|js)$/.test(full)) out.push(full);
  }
  return out;
}

const files = walk(SRC);
const IMPORT_RE = /from\s+["'](\.[^"']+)["']/g;

const edges = new Map();
for (const file of files) {
  const src = readFileSync(file, "utf8");
  const targets = [];
  for (const m of src.matchAll(IMPORT_RE)) {
    const base = resolve(dirname(file), m[1]);
    for (const ext of EXTS) {
      const candidate = base + ext;
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        targets.push(candidate);
        break;
      }
    }
  }
  edges.set(file, targets);
}

const entry = join(SRC, "main.jsx");
const seen = new Set([entry]);
const queue = [entry];
while (queue.length) {
  const node = queue.shift();
  for (const t of edges.get(node) ?? []) {
    if (!seen.has(t)) {
      seen.add(t);
      queue.push(t);
    }
  }
}

const dead = files
  .filter((f) => !seen.has(f) && !/\.test\./.test(f) && !f.startsWith(join(SRC, "test") + sep))
  .map((f) => f.replace(SRC + "\\", ""))
  .sort();

console.log("=== UNREACHABLE from src/main.jsx (excluding *.test.*) ===");
for (const f of dead) console.log("  " + f);
console.log(`\ndead: ${dead.length}   reachable: ${seen.size} / ${files.length}`);
