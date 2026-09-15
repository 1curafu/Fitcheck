import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
const ROOT = process.cwd();
const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".wasm": "application/wasm", ".onnx": "application/octet-stream" };
const server = createServer((req, res) => {
  const path = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream", "cross-origin-opener-policy": "same-origin", "cross-origin-embedder-policy": "require-corp" });
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => console.log("[console]", m.type(), m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 300)));
page.on("requestfailed", (r) => console.log("[reqfail]", r.url(), r.failure()?.errorText));
await page.goto(`http://localhost:${port}/scripts/cutout-harness/harness.html`);
await page.waitForFunction(() => window.harnessReady, null, { timeout: 30000 }).catch((e) => console.log("not ready:", e.message.slice(0, 100)));
const r = await page.evaluate(async () => {
  try {
    const ort = await import("onnxruntime-web/wasm");
    ort.env.wasm.wasmPaths = "/public/ort/";
    const s = await ort.InferenceSession.create("/public/models/u2netp.onnx", { executionProviders: ["wasm"] });
    return { ok: true, inputs: s.inputNames, outputs: s.outputNames };
  } catch (e) { return { ok: false, err: String(e), stack: String(e.stack).slice(0, 900) }; }
});
console.log(r);
await browser.close(); server.close();
