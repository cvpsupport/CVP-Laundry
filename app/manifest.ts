import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MEW Laundry",
    short_name: "MEW Laundry",
    description: "ดูสถานะเครื่องซักผ้าและรับแจ้งเตือนเมื่อใกล้เสร็จหรือซักเสร็จ",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7fb",
    theme_color: "#2563eb",
    lang: "th",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
