#!/usr/bin/env node
// Authenticated NotebookLM exporter. Requires an Edge window started with
// --remote-debugging-port=9222 and a signed-in Google session.
// Usage: node scripts/pull_notebooks.mjs [--limit N]
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAPTURES = join(ROOT, "research", "captures", "notebooklm");
const CDP = "http://127.0.0.1:9222";
const SETTLE_MS = 4500;
const NAV_TIMEOUT_MS = 45000;
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex").toUpperCase();

function parseNotebookUrls() {
  const raw = readFileSync(join(ROOT, "notebooks.txt"), "utf8");
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("https://notebook.google.com/notebook/"))
    .map((l) => {
      const m = l.match(/^(https:\/\/notebook\.google\.com\/notebook\/[0-9a-f-]+)/);
      return { url: m[1], id: m[1].split("/").pop(), flaggedCantShare: /cant share/i.test(l) };
    });
}

async function cdpTargets() {
  const r = await fetch(`${CDP}/json/list`);
  if (!r.ok) throw new Error(`CDP unreachable: ${r.status}`);
  return r.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let seq = 0;
  const ready = new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error("websocket error"));
  });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const id = ++seq;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          rej(new Error(`timeout: ${method}`));
        }
      }, 60000);
    });
  return { ready, send, close: () => ws.close() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractSourceTitles(html) {
  const seen = new Set();
  const out = [];
  const re = /Select ([^<"]{4,200}?\.(?:pdf|docx|doc|pptx|txt|md|csv|png|jpg|jpeg|html|htm|epub|mp3|mp4))/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const title = m[1].trim().replace(/\s+/g, " ");
    if (title && !seen.has(title)) {
      seen.add(title);
      out.push(title);
    }
  }
  if (out.length === 0) {
    const re2 = /([A-Za-z0-9][^<"]{2,180}?\.(?:pdf|docx|doc|pptx|txt|md))/g;
    while ((m = re2.exec(html)) !== null) {
      const title = m[1].trim().replace(/\s+/g, " ");
      if (title && !/^(https?:|\/\/|function|var |const )/i.test(title) && !seen.has(title)) {
        seen.add(title);
        out.push(title);
      }
    }
  }
  return out.slice(0, 60);
}

async function evaluate(send, expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || "evaluate failed");
  return r.result.value;
}

async function waitForContent(send) {
  const start = Date.now();
  while (Date.now() - start < NAV_TIMEOUT_MS) {
    const state = await evaluate(
      send,
      `JSON.stringify({host: location.hostname, ready: document.readyState, title: document.title, text: (document.body && document.body.innerText || "").length})`
    ).catch(() => null);
    if (state) {
      const s = JSON.parse(state);
      if (s.host === "accounts.google.com") return { kind: "AUTH_WALL" };
      if (s.ready === "complete" && s.text > 200 && s.title) {
        await sleep(SETTLE_MS);
        return { kind: "OK" };
      }
    }
    await sleep(700);
  }
  return { kind: "TIMEOUT" };
}

async function main() {
  mkdirSync(CAPTURES, { recursive: true });
  const notebooks = parseNotebookUrls().slice(0, LIMIT);
  const targets = await cdpTargets();
  let page = targets.find((t) => t.type === "page" && t.url.startsWith("https://notebook.google.com/"));
  if (!page) {
    const created = await fetch(`${CDP}/json/new?${encodeURIComponent("https://notebook.google.com/")}`, { method: "PUT" });
    page = await created.json();
  }
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const results = [];
  for (const nb of notebooks) {
    process.stdout.write(`${nb.id} ... `);
    let rec;
    try {
      await cdp.send("Page.navigate", { url: nb.url });
      const state = await waitForContent(cdp.send);
      if (state.kind === "AUTH_WALL") {
        rec = { ...nb, status: "AUTH_WALL" };
        console.log("AUTH_WALL");
      } else if (state.kind === "TIMEOUT") {
        rec = { ...nb, status: "TIMEOUT" };
        console.log("TIMEOUT");
      } else {
        const data = await evaluate(
          cdp.send,
          `JSON.stringify({title: document.title, text: document.body.innerText})`
        );
        const parsed = JSON.parse(data);
        const html = await evaluate(cdp.send, `document.documentElement.outerHTML`);
        const sources = extractSourceTitles(html);
        const sourceSection = sources.length
          ? `\n\n## Sources (${sources.length})\n\n${sources.map((s) => `- ${s}`).join("\n")}\n`
          : "";
        const text = `# ${parsed.title}\n\nSource: ${nb.url}\nFetched: ${new Date().toISOString()}\nAuth: authenticated CDP session (Edge, debug port 9222)\n\n---\n\n${parsed.text}${sourceSection}\n`;
        const txtPath = join(CAPTURES, `${nb.id}.txt`);
        const htmlPath = join(CAPTURES, `${nb.id}.html`);
        writeFileSync(txtPath, text, "utf8");
        writeFileSync(htmlPath, html, "utf8");
        rec = {
          ...nb,
          status: "OK",
          pageTitle: parsed.title,
          textChars: text.length,
          htmlChars: html.length,
          txtPath: `research/captures/notebooklm/${nb.id}.txt`,
          txtSha256: sha256(Buffer.from(text, "utf8")),
          htmlPath: `research/captures/notebooklm/${nb.id}.html`,
          htmlSha256: sha256(Buffer.from(html, "utf8")),
          fetchedAt: new Date().toISOString(),
        };
        console.log(`OK ${text.length}B "${parsed.title}"`);
      }
    } catch (e) {
      rec = { ...nb, status: "ERROR", error: String(e.message || e) };
      console.log(`ERROR ${rec.error}`);
    }
    results.push(rec);
    await sleep(1200);
  }

  const manifestPath = join(CAPTURES, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify({ fetchedAt: new Date().toISOString(), results }, null, 2), "utf8");
  const ok = results.filter((r) => r.status === "OK").length;
  console.log(`\nDONE ok=${ok}/${results.length} manifest=research/captures/notebooklm/manifest.json`);
  cdp.close();
  process.exit(ok === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
