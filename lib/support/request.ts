import "server-only";
import type { ProviderFailure } from "./schema";

/** Both support providers share a deadline covering headers AND body parsing. */
export async function requestSupportJson(
  request: (signal: AbortSignal) => Promise<Response>,
  deadlineMs: number,
): Promise<{ status: "ok"; body: unknown } | ProviderFailure> {
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error("Support provider deadline"));
    }, deadlineMs);
  });
  try {
    return await Promise.race([
      (async (): Promise<{ status: "ok"; body: unknown } | ProviderFailure> => {
        const response = await request(controller.signal);
        if (!response.ok) {
          // Stop the unread error body as well as returning a bounded failure.
          controller.abort();
          const httpClass = response.status >= 400 && response.status < 500 ? "4xx"
            : response.status >= 500 && response.status < 600 ? "5xx" : "other";
          return { status: "failed", reason: "http", httpClass };
        }
        try {
          return { status: "ok", body: await response.json() };
        } catch {
          return { status: "failed", reason: timedOut ? "timeout" : "malformed" };
        }
      })(),
      deadline,
    ]);
  } catch {
    return { status: "failed", reason: timedOut ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}
