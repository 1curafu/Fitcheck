import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Capture sends the base64 original JPEG + PNG cutout to the uploadAndTag
    // Server Action in one call; the two blobs exceed the default 1 MB body cap.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
