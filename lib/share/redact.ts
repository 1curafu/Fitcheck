/** A share token is a capability in both the page URL and the public Storage object URL (spec §0 A10). */
export function redactShareUrl(url: string): string {
  return url
    .replace(/\/l\/[A-Za-z0-9_-]+/g, "/l/[token]")
    .replace(/\/shares\/[A-Za-z0-9_-]{22}(?=\/|[?#]|$)/g, "/shares/[token]");
}

/** Sentry payloads can carry URLs in breadcrumbs, headers, exceptions, spans, logs and metric attributes. */
export function redactShareData<T>(value: T): T {
  const seen = new WeakSet<object>();
  const visit = (item: unknown): unknown => {
    if (typeof item === "string") return redactShareUrl(item);
    if (item === null || typeof item !== "object" || seen.has(item)) return item;
    seen.add(item);
    for (const key of Object.keys(item)) {
      const record = item as Record<string, unknown>;
      record[key] = visit(record[key]);
    }
    return item;
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
