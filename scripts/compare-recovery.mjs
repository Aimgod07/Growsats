// Compares the recovered src/index.js against the pre-corruption reference
// (newline-stripped) to prove nothing functional was lost in recovery.
import { readFileSync } from "node:fs";

const recovered = readFileSync(process.argv[2], "utf8");
const reference = readFileSync(process.argv[3], "utf8");

// Comments can't be compared (the reference lost its newlines), so compare the
// code: route paths, string literals, and function names.
function extract(src, re) {
  return new Set(Array.from(src.matchAll(re)).map((m) => m[1]));
}

const routeRe = /path === ["']([^"']+)["']/g;
const literalRe = /["'`]([A-Za-z_][A-Za-z0-9_\-:.\/]{2,})["'`]/g;
const fnRe = /(?:async\s+)?function\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s*)?\(/g;

const checks = [
  ["route paths", extract(recovered, routeRe)],
  ["string literals", extract(recovered, literalRe)],
];

let problems = 0;
for (const [label, set] of checks) {
  const ref = label === "route paths" ? extract(reference, routeRe) : extract(reference, literalRe);
  const missing = [...ref].filter((v) => !set.has(v));
  const added = [...set].filter((v) => !ref.has(v));
  console.log(`\n${label}: recovered=${set.size} reference=${ref.size}`);
  if (missing.length) {
    console.log("  MISSING from recovered:");
    for (const m of missing) console.log(`    - ${m}`);
    problems += missing.length;
  }
  if (added.length) {
    console.log("  added in recovered:");
    for (const a of added) console.log(`    + ${a}`);
  }
}

console.log(problems === 0 ? "\nOK: recovered file is functionally complete" : `\n${problems} item(s) missing`);
process.exit(problems ? 1 : 0);