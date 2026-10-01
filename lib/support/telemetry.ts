import "server-only";
import * as Sentry from "@sentry/nextjs";
import type { ProviderFailure } from "./schema";

export function reportSupportFailure(info: {
  stage: "verify" | "send" | "action";
  outcome: ProviderFailure["reason"] | "rejected" | "unexpected";
  httpClass?: ProviderFailure["httpClass"];
}): void {
  try {
    const client = Sentry.getClient();
    if (!client) return;
    // Request scopes carry arbitrary SDK metadata. Fresh scopes keep support private.
    const isolation = new Sentry.Scope();
    const scope = new Sentry.Scope();
    isolation.setClient(client);
    scope.setClient(client);
    Sentry.withIsolationScope(isolation, () => {
      Sentry.withScope(scope, () => {
        Sentry.captureMessage("Support submission failed", {
          level: "warning",
          tags: {
            feature: "support", stage: info.stage, outcome: info.outcome,
            ...(info.httpClass ? { httpClass: info.httpClass } : {}),
          },
        });
      });
    });
  } catch {
    // Diagnostics must never change the product result or log private exceptions.
  }
}
