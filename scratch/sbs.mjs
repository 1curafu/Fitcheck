// original | imgly baseline | ours — on the app's dark canvas, for one asset.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const name = process.argv[2];
const b64 = (p) => readFileSync(p).toString("base64");
const orig = `data:image/${name.endsWith(".png") ? "png" : "jpeg"};base64,${b64(`Test assets/${name}`)}`;
const stem = name.replace(/\.[^.]+$/, ".png");
const base = `data:image/png;base64,${b64(`scratch/baseline/${stem}`)}`;
const ours = `data:image/png;base64,${b64(`scratch/ours/${stem}`)}`;
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 2000, height: 700 } });
await page.setContent(`<body style="margin:0;background:#0e0e10;display:flex;gap:12px;padding:12px">
${[["original", orig], ["@imgly (baseline)", base], ["ours (u2netp)", ours]].map(([t, s]) => `<div style="color:#cfc8ba;font:14px sans-serif;text-align:center">${t}<br><img src="${s}" style="height:380px;display:block;margin-top:6px"></div>`).join("")}
</body>`);
await page.waitForLoadState("networkidle");
const el = await page.$("body"); await el.screenshot({ path: `scratch/sbs-${stem}` });
await browser.close(); console.log(`scratch/sbs-${stem}`);
