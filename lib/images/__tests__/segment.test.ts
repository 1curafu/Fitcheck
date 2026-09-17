import { toModelInput, maskBounds, U2NETP, U2NETP_REFINE } from "../segment";

test("the model is a parameter, and u2netp's is the one rembg uses", () => {
  // Wrong normalisation is the failure mode the plan warns about: plausible,
  // uniformly worse masks, not a crash. These are U²-Net's published constants.
  expect(U2NETP.inputSize).toBe(320);
  expect(U2NETP.mean).toEqual([0.485, 0.456, 0.406]);
  expect(U2NETP.std).toEqual([0.229, 0.224, 0.225]);
});

test("preprocess is NCHW, RGB, normalised per channel", () => {
  // One 2×1 image: a pure-red pixel and a pure-blue pixel.
  const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);
  const t = toModelInput(rgba, 2, 1, { mean: [0.5, 0.5, 0.5] as const, std: [0.5, 0.5, 0.5] as const });
  // Layout: [R over all pixels][G over all pixels][B over all pixels].
  expect(Array.from(t)).toEqual([
    1, -1, // R: red pixel (1-0.5)/0.5, blue pixel (0-0.5)/0.5
    -1, -1, // G
    -1, 1, // B
  ]);
});

test("preprocess ignores alpha", () => {
  const opaque = new Uint8ClampedArray([255, 255, 255, 255]);
  const clear = new Uint8ClampedArray([255, 255, 255, 0]);
  const cfg = { mean: [0, 0, 0] as const, std: [1, 1, 1] as const };
  expect(Array.from(toModelInput(opaque, 1, 1, cfg))).toEqual(Array.from(toModelInput(clear, 1, 1, cfg)));
});

test("maskBounds finds the confident pixels' box, and null for an empty mask", () => {
  const n = 8; const m = new Float32Array(n * n);
  m[2 * n + 3] = 0.9; m[5 * n + 6] = 0.7; m[7 * n + 0] = 0.2; // the last is below threshold
  expect(maskBounds(m, n)).toEqual({ x: 3, y: 2, w: 4, h: 4 });
  expect(maskBounds(new Float32Array(n * n), n)).toBeNull();
});

test("the shipped refinement punches background-coloured gaps (measured 2026-09-17: 2 up, 0 down)", () => {
  expect(U2NETP_REFINE.punch).toBe(true);
});
