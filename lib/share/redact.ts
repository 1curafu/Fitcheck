/** `/l/<token>` is a capability URL: analytics and error reports get `/l/[token]` instead (spec §0 A10). */
export function redactShareUrl(url: string): string {
  return url.replace(/\/l\/[A-Za-z0-9_-]+/g, "/l/[token]");
}
