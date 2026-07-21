import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hanzi Horizon",
    short_name: "Hanzi Horizon",
    description: "Apprendre le chinois avec le vocabulaire HSK, des quiz et des révisions intelligentes.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f7f1e7",
    theme_color: "#315f50",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
