// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://bf4b894619f1d63080b7a4a52a1d00f8@o4511981956300800.ingest.de.sentry.io/4511981962002512",

  // ⚠️ No Session Replay, deliberately (removed 2026-09-15 with the privacy
  // policy). It recorded 10% of all sessions and every session with an error —
  // what the user SAW, in an app whose screens are someone's wardrobe. Sentry
  // masks text and blocks images by default, but it is still behavioural
  // recording, it is the one thing that would turn the cookie notice into a
  // consent toggle, and nothing needed it. Errors alone are legitimate interest
  // and are disclosed in /privacy.
  integrations: [],

  // 10%. The template's 100% burned quota on timings nobody read.
  tracesSampleRate: 0.1,

  dataCollection: {
    // Neither is needed to debug a styling app, and /privacy promises error
    // reports carry no more than the error, the page and the browser.
    userInfo: false,
    httpBodies: [],
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
