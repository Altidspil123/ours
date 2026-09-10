import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest — makes the app installable, which is
// required for push notifications on iPhones (Add to Home Screen first).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ours. — just us two",
    short_name: "ours.",
    description: "A small universe built for exactly two people.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0810",
    theme_color: "#0c0810",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
