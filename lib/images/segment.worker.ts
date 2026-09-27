import { configureRuntime, segment, U2NETP, U2NETP_REFINE } from "./segment";

type Request = { id: number; source: Blob; target: Blob };
type Response =
  | { id: number; ok: true; cutout: Blob }
  | { id: number; ok: false; message: string };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage(message: Response): void;
};

scope.onmessage = async ({ data: { id, source, target } }) => {
  try {
    configureRuntime("/ort/");
    const cutout = await segment(source, U2NETP, target, U2NETP_REFINE);
    scope.postMessage({ id, ok: true, cutout });
  } catch (error) {
    scope.postMessage({ id, ok: false, message: error instanceof Error ? error.message : "Cutout failed" });
  }
};
