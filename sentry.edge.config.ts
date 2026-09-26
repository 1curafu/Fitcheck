// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { redactShareUrl } from "@/lib/share/redact";

Sentry.init({
  dsn: "https://bf4b894619f1d63080b7a4a52a1d00f8@o4511981956300800.ingest.de.sentry.io/4511981962002512",

  // 10%, matching the client. 100% was the template default.
  tracesSampleRate: 0.1,

  // A shared look's URL is a capability (spec §0 A10): the token never reaches Sentry.
  beforeSend(event) {
    if (event.request?.url) event.request.url = redactShareUrl(event.request.url);
    return event;
  },
  beforeSendTransaction(event) {
    if (event.transaction) event.transaction = redactShareUrl(event.transaction);
    if (event.request?.url) event.request.url = redactShareUrl(event.request.url);
    return event;
  },

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});
