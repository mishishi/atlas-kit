import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { getAllCards } from "@/lib/data";
import { MapView } from "@/components/map-view";

export const metadata: Metadata = {
  title: "地图 · 图鉴社",
  description: "在地图上看图鉴社的地理图鉴 — 12 张有坐标的图鉴分布在中国大地。",
  // Round 27 (2026-06-17): explicit OG image for /map shares.
  openGraph: {
    title: "地图 · 图鉴社",
    description: "在地图上看图鉴社的地理图鉴。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "地图 · 图鉴社",
    description: "在地图上看图鉴社的地理图鉴。",
  },
};

export default function MapPage() {
  // Pick out cards that have coords. Cards without coords simply
  // don't appear on the map (aurora, abstract phenomena, etc).
  const cards = getAllCards();
  const geoCards = cards
    .filter((c) => c.coords && typeof c.coords.lat === "number" && typeof c.coords.lng === "number")
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle,
      image: c.image_thumb ?? c.image,
      kind: c.kind,
      lat: c.coords!.lat,
      lng: c.coords!.lng,
    }));

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-6 max-w-2xl">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-deep mb-3">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span>地图</span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
          中国大地上, {geoCards.length} 张图鉴
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          标记是有坐标的图鉴 — 城市、地标、地理现象。点标记看图鉴卡片, 缩放看地区聚类。
          极光 (全球) 与抽象概念暂无坐标, 留在文本图鉴里。
        </p>
      </header>

      <MapView markers={geoCards} />
    </div>
  );
}
