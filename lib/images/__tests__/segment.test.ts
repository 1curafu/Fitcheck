import { toModelInput, U2NETP } from "../segment";

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
