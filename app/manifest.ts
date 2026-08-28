import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fitcheck",
    short_name: "Fitcheck",
    description: "Your AI stylist. Daily looks from the clothes you already own.",
    start_url: "/",
    display: "standalone",
    background_color: "#0E0E10",
    theme_color: "#0E0E10",
    icons: [
      /**
       * ⚠️ Raster, not the SVG this previously pointed at. Android's installer
       * and the splash-screen generator want real pixel sizes — an
       * `sizes: "any"` SVG is accepted for the tab favicon but is NOT a
       * dependable source for a home-screen icon, and the app installed with a
       * placeholder because of it.
       */
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      /**
       * ⚠️ `maskable` is a SEPARATE entry, never a second purpose on the same
       * file. Android crops a maskable icon to whatever shape the launcher
       * uses, so it needs the 20% safe-zone padding this export has; declaring
       * the unpadded 512 as maskable would crop the mark's tile.
       */
      { src: "/brand/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
