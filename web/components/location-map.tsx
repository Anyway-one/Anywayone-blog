"use client";

import { useCallback, useEffect, useRef } from "react";
import { resolveChinaLocation } from "@/lib/china-locations";
import styles from "./location-map.module.css";

const MAP_COLORS = {
  base: "#d8d6ce",
  line: "#f8f7f3",
  selected: "#e6a01f",
  selectedLine: "#1a1a1a",
} as const;

export function LocationMap({ location }: { location: string | null | undefined }) {
  const mapRef = useRef<HTMLObjectElement>(null);
  const resolved = resolveChinaLocation(location);

  const paintMap = useCallback(() => {
    const svg = mapRef.current?.contentDocument?.documentElement;
    if (!svg) return;

    svg.setAttribute("viewBox", "0 0 774.04419 569.65088");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");

    svg.querySelectorAll<SVGPathElement>("path[id^='CN-']").forEach((path) => {
      const isSelected = path.id === resolved?.regionId;
      path.setAttribute("fill", isSelected ? MAP_COLORS.selected : MAP_COLORS.base);
      path.setAttribute("stroke", isSelected ? MAP_COLORS.selectedLine : MAP_COLORS.line);
      path.setAttribute("stroke-width", isSelected ? "1.6" : "1");
      path.setAttribute("vector-effect", "non-scaling-stroke");
      path.style.transition = "fill 180ms ease, stroke 180ms ease";
    });
  }, [resolved?.regionId]);

  useEffect(() => {
    paintMap();
  }, [paintMap]);

  return (
    <figure className={styles.map} aria-label={location ? `${location} 在中国地图上的位置` : "中国地图"}>
      <object
        ref={mapRef}
        className={styles.mapObject}
        data="/map/china.svg"
        type="image/svg+xml"
        aria-hidden="true"
        tabIndex={-1}
        onLoad={paintMap}
      />
      {resolved && <span
        className={styles.marker}
        style={{ left: `${resolved.marker.x}%`, top: `${resolved.marker.y}%` }}
        aria-hidden="true"
      ><i /></span>}
      <figcaption>{resolved?.city || (resolved ? "所在区域" : "等待坐标")}</figcaption>
    </figure>
  );
}
