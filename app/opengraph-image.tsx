import { ImageResponse } from "next/og";

export const alt = "Fitcheck — your AI stylist";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Rendered once at build. The serif is fetched from Google Fonts here because
// next/font's copy is not reachable from the OG renderer; if the fetch fails the
// card still builds, in the renderer's default sans.
const CASLON = {
  regular: "https://fonts.gstatic.com/s/librecaslontext/v5/DdT878IGsGw1aF1JU10PUbTvNNaDMcq_.ttf",
  italic: "https://fonts.gstatic.com/s/librecaslontext/v5/DdT678IGsGw1aF1JU10PUbTvNNaDMfq91-c.ttf",
};

async function font(url: string, style: "normal" | "italic") {
  try {
    const data = await fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null));
    return data ? [{ name: "Libre Caslon Text", data, style, weight: 400 as const }] : [];
  } catch {
    return [];
  }
}

export default async function Image() {
  const fonts = [...(await font(CASLON.regular, "normal")), ...(await font(CASLON.italic, "italic"))];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", background: "#0E0E10", color: "#EDE6D8",
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: "0.34em", textTransform: "uppercase", color: "#b86a47" }}>
          Your AI Stylist
        </div>
        <div style={{ fontSize: 168, fontFamily: "Libre Caslon Text, Georgia, serif", letterSpacing: "-0.02em", marginTop: 12 }}>
          fitcheck
        </div>
        <div style={{ fontSize: 34, fontFamily: "Libre Caslon Text, Georgia, serif", fontStyle: "italic", color: "#928C7F", marginTop: 24, maxWidth: 760, textAlign: "center" }}>
          A wardrobe that thinks. Daily looks, composed from the clothes you already own.
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
