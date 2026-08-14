import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceDirs = ["app", "components", "lib"];
const extensions = new Set([".js", ".jsx", ".mjs"]);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) files.push(full);
  }
}
for (const dir of sourceDirs) walk(path.join(root, dir));

const rel = (p) => path.relative(root, p).replaceAll(path.sep, "/");
const sourceSet = new Set(files.map(rel));
const graph = new Map(files.map((f) => [f, new Set()]));
const importRe = /(?:from\s+["']|import\s*\(\s*["'])([^"']+)["']/g;

function resolveImport(from, spec) {
  const base = spec.startsWith("@/")
    ? path.join(root, spec.slice(2))
    : path.resolve(path.dirname(from), spec);
  const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`, path.join(base, "page.js")];
  return candidates.find((x) => fs.existsSync(x) && fs.statSync(x).isFile()) || null;
}

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(importRe)) {
    const target = resolveImport(file, match[1]);
    if (target) graph.get(file).add(target);
  }
}

const roots = files.filter((f) => f.startsWith(path.join(root, "app")) && (f.endsWith("page.js") || f.endsWith("layout.js")));
const seen = new Set();
const queue = [...roots];
while (queue.length) {
  const file = queue.pop();
  if (seen.has(file)) continue;
  seen.add(file);
  for (const next of graph.get(file) || []) queue.push(next);
}

const candidates = files.filter((f) => (f.includes(`${path.sep}lib${path.sep}`) || f.includes(`${path.sep}components${path.sep}`)) && !seen.has(f));
if (!candidates.length) {
  console.log("Cleanup: no unused lib/component files found.");
  process.exit(0);
}

// Only remove a candidate when its filename is not mentioned anywhere else.
// This protects dynamic imports and string-based references.
const allText = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
const safe = candidates.filter((file) => {
  const base = path.basename(file);
  const stem = base.replace(/\.[^.]+$/, "");
  return !allText.includes(base) && !allText.includes(stem);
});

for (const file of safe) {
  fs.unlinkSync(file);
  console.log(`Deleted unused source: ${rel(file)}`);
}
for (const file of candidates.filter((x) => !safe.includes(x))) {
  console.log(`Kept ambiguous source (possible dynamic/string reference): ${rel(file)}`);
}
