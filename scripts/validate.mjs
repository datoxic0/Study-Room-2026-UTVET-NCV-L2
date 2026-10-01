import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "research" || name === ".git") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(root);
const jsFiles = files.filter((f) => /\.(js|mjs)$/.test(f));
const html = readFileSync(join(root, "index.html"), "utf8");

for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    errors.push(`SYNTAX ${file}: ${(err.stderr || err.message).toString().trim().split("\n")[0]}`);
  }
  const source = readFileSync(file, "utf8");
  const browserModule =
    file.split(/[\\/]/).includes("js") || /[/\\](app\.js|sw\.js)$/.test(file);
  if (browserModule && /console\.log\(/.test(source)) {
    errors.push(`CONSOLE_LOG ${file}: console.log left in browser source`);
  }
  if (browserModule && /\bd\w*a\w*e\w*m\w*o\w*n\b/i.test(source)) {
    errors.push(`TERMINOLOGY ${file}: prohibited background-worker term (Angel standard)`);
  }
}

const selectorIds = new Set();
for (const file of jsFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/querySelector\(\s*["'`]#([A-Za-z0-9_-]+)/g)) {
    if (!match[1].endsWith("-")) selectorIds.add(match[1]);
  }
  for (const match of source.matchAll(/querySelectorAll\(\s*["'`]#([A-Za-z0-9_-]+)/g)) {
    if (!match[1].endsWith("-")) selectorIds.add(match[1]);
  }
  for (const match of source.matchAll(/["'`]#view-([a-z]+)/g)) {
    selectorIds.add(`view-${match[1]}`);
  }
}
const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const id of selectorIds) {
  if (!htmlIds.has(id)) errors.push(`MISSING_ID index.html has no #${id} referenced by JS`);
}

const navViews = [...html.matchAll(/data-nav="([a-z]+)"/g)].map((m) => m[1]);
for (const view of navViews) {
  if (!htmlIds.has(`view-${view}`)) errors.push(`NAV missing view section for data-nav=${view}`);
}
if (!html.includes('script type="module" src="app.js"')) errors.push("HTML app.js module script missing");
if (!html.includes('manifest.webmanifest')) errors.push("HTML manifest link missing");

const sourcesMod = await import(pathToFileURL(join(root, "js", "data", "sources.js")).href);
const examsMod = await import(pathToFileURL(join(root, "js", "data", "exams.js")).href);
const notebooksMod = await import(pathToFileURL(join(root, "js", "data", "notebooks.js")).href);
const datesMod = await import(pathToFileURL(join(root, "js", "core", "dates.js")).href);

for (const url of [
  ...sourcesMod.globalSources.map((s) => s.url),
  ...sourcesMod.paperSubjects.flatMap((s) => s.links.map((l) => l.url)),
]) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    errors.push(`BAD_URL not parseable: ${url}`);
    continue;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) errors.push(`BAD_URL protocol: ${url}`);
}
for (const source of sourcesMod.globalSources) {
  if (!["official", "community"].includes(source.klass)) errors.push(`BAD_CLASS ${source.id}`);
  if (!["verified", "unreachable"].includes(source.status)) errors.push(`BAD_STATUS ${source.id}`);
}
for (const subject of sourcesMod.paperSubjects) {
  if (!subject.links.length) errors.push(`EMPTY_LINKS ${subject.id}`);
  for (const link of subject.links) {
    if (!link.source || !link.klass || !link.status) errors.push(`LINK_FIELDS ${subject.id} missing meta`);
  }
}

const exams = examsMod.exams;
const parsedDates = exams.map((e) => datesMod.parseExamDate(e.date).getTime());
if (parsedDates.some((t) => Number.isNaN(t))) errors.push("EXAM unparseable date");
for (let i = 1; i < parsedDates.length; i += 1) {
  if (parsedDates[i] < parsedDates[i - 1]) errors.push(`EXAM not sorted ascending at index ${i}`);
}
for (const exam of exams) {
  if (exam.level !== "L2") errors.push(`EXAM unexpected level ${exam.level}`);
  if (!/^\d{2}:\d{2}$/.test(exam.time)) errors.push(`EXAM bad time ${exam.time}`);
}
for (const exam of exams) {
  if (!sourcesMod.subjectByName(exam.subject)) errors.push(`EXAM subject without paper registry: ${exam.subject}`);
}

const notebooks = notebooksMod.notebooks;
if (notebooks.length !== 17) errors.push(`NOTEBOOKS expected 17 got ${notebooks.length}`);
const ids = new Set(notebooks.map((n) => n.id));
const urls = new Set(notebooks.map((n) => n.url));
if (ids.size !== notebooks.length) errors.push("NOTEBOOKS duplicate ids");
if (urls.size !== notebooks.length) errors.push("NOTEBOOKS duplicate urls");
for (const notebook of notebooks) {
  try {
    const parsed = new URL(notebook.url);
    if (!["notebook.google.com", "gemini.google.com"].includes(parsed.hostname))
      errors.push(`NOTEBOOK unexpected host ${notebook.url}`);
  } catch {
    errors.push(`NOTEBOOK bad url ${notebook.url}`);
  }
}

const shellMatch = readFileSync(join(root, "sw.js"), "utf8").match(/const SHELL = \[([\s\S]*?)\];/);
if (!shellMatch) {
  errors.push("SW SHELL array not found");
} else {
  for (const raw of shellMatch[1].match(/"([^"]+)"/g) ?? []) {
    const asset = raw.slice(1, -1);
    if (asset === ".") continue;
    if (!existsSync(join(root, asset))) errors.push(`SW missing asset ${asset}`);
  }
}

const shellNotebook = JSON.parse(readFileSync(join(root, "data", "notebooks", "index.json"), "utf8"));
if (!Array.isArray(shellNotebook.documents)) errors.push("INDEX_JSON documents must be an array");

if (warnings.length) {
  console.log(`warnings: ${warnings.length}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);
}
if (errors.length) {
  console.error(`lint failed: ${errors.length} error(s)`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`lint passed: ${jsFiles.length} modules parsed, ${selectorIds.size} DOM ids resolved, registry URLs valid, data sane`);
