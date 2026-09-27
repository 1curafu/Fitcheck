/** A share token is a capability in both the page URL and the public Storage object URL (spec §0 A10). */
export function redactShareUrl(url: string): string {
  return url
    .replace(/\/l\/[A-Za-z0-9_-]+/g, "/l/[token]")
    .replace(/\/shares\/[A-Za-z0-9_-]{22}(?=\/|[?#]|$)/g, "/shares/[token]");
}

/**
 * Sentry payloads can carry URLs in breadcrumbs, headers, exceptions, spans, logs and metric attributes. Returns a
 * scrubbed COPY of plain objects and arrays: a console breadcrumb holds the app's own argument array, so editing in
 * place would rewrite what the app logged (or its state). Class instances are passed through untouched.
 */
export function redactShareData<T>(value: T): T {
  const seen = new WeakMap<object, unknown>();
  const visit = (item: unknown): unknown => {
    if (typeof item === "string") return redactShareUrl(item);
    if (item === null || typeof item !== "object") return item;
    if (seen.has(item)) return seen.get(item);
    if (Array.isArray(item)) {
      const out: unknown[] = [];
      seen.set(item, out);
      for (const v of item) out.push(visit(v));
      return out;
    }
    const proto = Object.getPrototypeOf(item);
    if (proto !== Object.prototype && proto !== null) return item;
    const out: Record<string, unknown> = {};
    seen.set(item, out);
    for (const [k, v] of Object.entries(item)) out[k] = visit(v);
    return out;
  };
  return visit(value) as T;
}

export const shareTelemetryFilters = {
  beforeSend: redactShareData,
  beforeSendTransaction: redactShareData,
  beforeSendSpan: redactShareData,
  beforeSendLog: redactShareData,
  beforeSendMetric: redactShareData,
  beforeBreadcrumb: redactShareData,
};
