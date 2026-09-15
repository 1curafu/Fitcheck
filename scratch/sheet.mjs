import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const rows = JSON.parse(readFileSync("scratch/parity.json", "utf8")).filter((r) => r.iou < 0.98).sort((a, b) => a.iou - b.iou);
const b64 = (p) => readFileSync(p).toString("base64");
const html = rows.map((r) => {
  const stem = r.name.replace(/\.[^.]+$/, ".png");
  const img = (src) => `<img src="${src}" style="height:170px;max-width:300px;object-fit:contain;display:block">`;
  return `<div style="display:flex;gap:10px;align-items:center;color:#cfc8ba;font:12px sans-serif">
    <div style="width:300px">${r.name.replace("Screenshot 2026-","")}<br><b>IoU ${r.iou.toFixed(3)}</b> cov ${r.covBase.toFixed(2)}→${r.covOurs.toFixed(2)}</div>
    ${img(`data:image/png;base64,${b64(`scratch/baseline/${stem}`)}`)}
    ${img(`data:image/png;base64,${b64(`scratch/ours/${stem}`)}`)}
  </div>`;
}).join("");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 200 * rows.length + 40 } });
await page.setContent(`<body style="margin:0;background:#0e0e10;padding:10px;display:flex;flex-direction:column;gap:8px">
<div style="display:flex;gap:10px;color:#928c7f;font:12px sans-serif"><div style="width:300px"></div><div style="width:300px">@imgly (today)</div><div style="width:300px">ours (u2netp)</div></div>${html}</body>`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: "scratch/sheet.png", fullPage: true });
await browser.close(); console.log(rows.length, "rows");
