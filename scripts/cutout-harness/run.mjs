/**
 * Parity harness: runs @imgly (the library being removed) and our pipeline over
 * the real garment photos in `Test assets/`, and prints IoU per image.
 *
 *   node scripts/cutout-harness/run.mjs            # all assets
 *   node scripts/cutout-harness/run.mjs IMG_7913   # one, by substring
 *   node scripts/cutout-harness/run.mjs --check    # fail on any regression vs the committed reference
 *   node scripts/cutout-harness/run.mjs --record   # write the committed reference (a deliberate act)
 *
 * The reference (lib/images/__tests__/fixtures/parity-reference.json) is the
 * IoU-vs-@imgly per image at the last accepted stage. It is NOT ground truth —
 * @imgly is wrong on several of these — it is "what we shipped last", so a
 * change that lowers any image's number has to say why before it lands.
 *
 * Baselines from @imgly are cached in scratch/baseline/ so the 88 MB model is
 * downloaded once. ⚠️ Every row is printed, never only a mean — one bad cutout
 * hides inside a good average.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const SCRATCH = join(ROOT, "scratch");
const BASE = join(SCRATCH, "baseline");
const OURS = join(SCRATCH, "ours");
for (const d of [SCRATCH, BASE, OURS, join(SCRATCH, "harness-build")]) mkdirSync(d, { recursive: true });

// The pipeline under test is the SOURCE file, emitted to ESM for the browser.
execSync(
  "npx tsc lib/images/segment.ts lib/images/mask-metrics.ts --module esnext --target es2022 --moduleResolution bundler --skipLibCheck --ignoreConfig --lib es2022,dom --outDir scratch/harness-build",
  { stdio: "inherit" },
);
execSync("node scripts/copy-ort.mjs");

const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".wasm": "application/wasm", ".onnx": "application/octet-stream", ".json": "application/json" };
const server = createServer((req, res) => {
  const path = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {
    "content-type": MIME[extname(path)] ?? "application/octet-stream",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-embedder-policy": "require-corp",
  });
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const RECORD = args.includes("--record");
const COMPRESS = args.includes("--compressed-input");
const filter = args.find((a) => !a.startsWith("--")) ?? "";
const REF = join(ROOT, "lib/images/__tests__/fixtures/parity-reference.json");
const assets = readdirSync(join(ROOT, "Test assets")).filter((f) => /\.(jpe?g|png)$/i.test(f) && f.includes(filter));

const browser = await chromium.launch();
// ⚠️ Two pages, two JS realms. @imgly bundles its own (older) onnxruntime and
// shares a global with ours; in one page it picked up our 1.30 WASM and died.
const open = async (file) => {
  const p = await browser.newPage();
  p.on("console", (m) => { if (m.type() === "error") console.error("  [page]", m.text()); });
  await p.goto(`http://localhost:${port}/scripts/cutout-harness/${file}`);
  await p.waitForFunction(() => window.harnessReady, null, { timeout: 60000 });
  return p;
};
const page = await open("harness.html");
let imglyPage = null;

// Only an input-size override is passed; everything else is the shipped U2NETP.
const model = process.env.SIZE ? { inputSize: Number(process.env.SIZE) } : {};
const rows = [];
for (const name of assets) {
  const file = join(ROOT, "Test assets", name);
  const b64 = readFileSync(file).toString("base64");
  const type = /\.png$/i.test(name) ? "image/png" : "image/jpeg";
  const basePath = join(BASE, name.replace(/\.[^.]+$/, ".png"));

  let baseline, baseMs = "cached";
  if (existsSync(basePath)) baseline = readFileSync(basePath).toString("base64");
  else {
    imglyPage ??= await open("harness-imgly.html");
    const r = await imglyPage.evaluate(([b, t]) => window.harness.run(b, t), [b64, type]);
    baseline = r.png; baseMs = r.ms;
    writeFileSync(basePath, Buffer.from(baseline, "base64"));
  }
  const ours = await page.evaluate(([b, t, m, c]) => window.harness.ours(b, t, m, c), [b64, type, model, COMPRESS]);
  writeFileSync(join(OURS, name.replace(/\.[^.]+$/, ".png")), Buffer.from(ours.png, "base64"));
  const cmp = await page.evaluate(([a, b]) => window.harness.compare(a, b), [baseline, ours.png]);
  rows.push({ name, iou: cmp.iou, covBase: cmp.coverageA, covOurs: cmp.coverageB, baseMs, oursMs: ours.ms, error: cmp.error });
  const r = rows.at(-1);
  console.log(`${name.padEnd(40)} IoU ${r.iou?.toFixed(4) ?? "  n/a "}  cov ${r.covBase?.toFixed(3)}→${r.covOurs?.toFixed(3)}  ${String(baseMs).padStart(6)}ms → ${String(ours.ms).padStart(5)}ms ${r.error ?? ""}`);
}
await browser.close(); server.close();

const worst = rows.filter((r) => r.iou != null).sort((a, b) => a.iou - b.iou);
console.log(`\n${rows.length} images · min IoU ${worst[0]?.iou.toFixed(4)} (${worst[0]?.name}) · below 0.98: ${worst.filter((r) => r.iou < 0.98).length}`);
writeFileSync(join(SCRATCH, "parity.json"), JSON.stringify(rows, null, 2));

const compact = Object.fromEntries(rows.map((r) => [r.name, Number(r.iou?.toFixed(4))]));
if (RECORD) {
  writeFileSync(REF, JSON.stringify(compact, null, 2) + "\n");
  console.log(`reference written: ${REF}`);
}
if (CHECK) {
  const ref = JSON.parse(readFileSync(REF, "utf8"));
  const TOLERANCE = 0.005;
  const regressions = rows.filter((r) => r.name in ref && r.iou < ref[r.name] - TOLERANCE);
  const gains = rows.filter((r) => r.name in ref && r.iou > ref[r.name] + TOLERANCE);
  for (const r of regressions) console.log(`REGRESSION ${r.name}: ${ref[r.name]} → ${r.iou.toFixed(4)}`);
  for (const r of gains) console.log(`gain       ${r.name}: ${ref[r.name]} → ${r.iou.toFixed(4)}`);
  console.log(`${regressions.length} regressions, ${gains.length} gains vs reference`);
  if (regressions.length) process.exit(1);
}
