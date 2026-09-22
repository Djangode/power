import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Power Primeur",
    short_name: "Power",
    description: "Fruits et légumes frais à Alfortville — livraison et Click & Collect.",
    start_url: "/",
    display: "standalone",
    background_color: "#090909",
    theme_color: "#f97316",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/logo-power-mark.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
