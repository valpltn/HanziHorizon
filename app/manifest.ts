import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hanzi Horizon",
    short_name: "Hanzi Horizon",
    description: "Apprendre le chinois avec le vocabulaire HSK, des quiz et des révisions intelligentes.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e7",
    theme_color: "#315f50",
    lang: "fr",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
