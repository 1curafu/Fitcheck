import type enUS from "./messages/en-US.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof enUS;
    Locale: import("./lib/i18n/locales").ShippedLocale;
  }
}
