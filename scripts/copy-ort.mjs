// Copies onnxruntime-web's WASM runtime into public/ort/ so the browser fetches
// it from OUR origin. Runs before build and dev; public/ort is gitignored
// because 14 MB of runtime per ORT upgrade does not belong in history.
import { copyFileSync, mkdirSync } from "node:fs";
const src = "node_modules/onnxruntime-web/dist/";
mkdirSync("public/ort", { recursive: true });
for (const f of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) copyFileSync(src + f, "public/ort/" + f);
