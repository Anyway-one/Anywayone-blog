"use client";

import type { EChartsType } from "echarts";
import { useEffect, useRef, useState } from "react";
import { resolveChinaLocation } from "@/lib/china-locations";
import styles from "./location-map.module.css";

interface GeoProperties {
  adcode?: number;
  name?: string;
  [key: string]: unknown;
}

interface GeoFeature {
  type: "Feature";
  properties: GeoProperties;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  } | {
    type: "MultiPolygon";
    coordinates: number[][][][];
  };
}

interface GeoJSON {
  type: "FeatureCollection";
  features: GeoFeature[];
}

interface MapModel {
  nationalMapName: string;
  detailMapName: string | null;
  nationalSelectedName: string;
  detailSelectedName: string | null;
  focusCenter: [number, number];
  detailLayoutSize: string;
}

const MAP_COLORS = {
  base: "#d8d6ce",
  line: "#f8f7f3",
  selected: "#e6a01f",
  selectedLine: "#1a1a1a",
  text: "#6b6964",
  selectedText: "#1a1a1a",
} as const;

const municipalityAdcodes = new Set(["110000", "120000", "310000", "500000"]);

function findFeature(geoJson: GeoJSON, predicate: (properties: GeoProperties) => boolean) {
  return geoJson.features.find((feature) => predicate(feature.properties));
}

type Bounds = [number, number, number, number];

function extendBounds(bounds: Bounds, coordinates: unknown): Bounds {
  if (!Array.isArray(coordinates)) return bounds;
  if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    bounds[0] = Math.min(bounds[0], coordinates[0]);
    bounds[1] = Math.min(bounds[1], coordinates[1]);
    bounds[2] = Math.max(bounds[2], coordinates[0]);
    bounds[3] = Math.max(bounds[3], coordinates[1]);
    return bounds;
  }
  coordinates.forEach((coordinate) => extendBounds(bounds, coordinate));
  return bounds;
}

function geoBounds(geoJson: GeoJSON): Bounds {
  return geoJson.features.reduce(
    (bounds, feature) => extendBounds(bounds, feature.geometry.coordinates),
    [Infinity, Infinity, -Infinity, -Infinity] as Bounds,
  );
}

function featureCenter(feature: GeoFeature): [number, number] {
  const bounds = extendBounds([Infinity, Infinity, -Infinity, -Infinity], feature.geometry.coordinates);
  return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
}

function detailLayoutSize(chinaGeoJson: GeoJSON, regionGeoJson: GeoJSON): string {
  const china = geoBounds(chinaGeoJson);
  const region = geoBounds(regionGeoJson);
  const chinaWidth = Math.max(china[2] - china[0], 1);
  const chinaHeight = Math.max(china[3] - china[1], 1);
  const regionRatio = Math.max((region[2] - region[0]) / chinaWidth, (region[3] - region[1]) / chinaHeight);
  const size = Math.min(48, Math.max(27, regionRatio * 100 * 1.35));
  return `${Math.round(size)}%`;
}

function mapOption(model: MapModel, detailed: boolean) {
  const nationalSeries = {
    type: "map",
    map: model.nationalMapName,
    roam: false,
    silent: true,
    selectedMode: false,
    layoutCenter: ["50%", "50%"],
    layoutSize: "101%",
    center: detailed ? model.focusCenter : undefined,
    zoom: detailed ? 2.15 : 1,
    label: { show: false },
    itemStyle: {
      areaColor: MAP_COLORS.base,
      borderColor: MAP_COLORS.line,
      borderWidth: 0.8,
    },
    emphasis: { disabled: true },
    data: model.nationalSelectedName ? [{
      name: model.nationalSelectedName,
      itemStyle: {
        areaColor: MAP_COLORS.selected,
        borderColor: MAP_COLORS.selectedLine,
        borderWidth: 1.2,
      },
      label: {
        show: !detailed,
        color: MAP_COLORS.selectedText,
        fontSize: 10,
        fontWeight: 600,
      },
    }] : [],
  };

  if (!detailed || !model.detailMapName) {
    return { animation: true, animationDurationUpdate: 560, animationEasingUpdate: "cubicOut" as const, tooltip: { show: false }, series: [nationalSeries] };
  }

  return {
    animation: true,
    animationDurationUpdate: 640,
    animationEasingUpdate: "cubicOut" as const,
    tooltip: { show: false },
    series: [nationalSeries, {
      type: "map",
      map: model.detailMapName,
      roam: false,
      silent: true,
      selectedMode: false,
      layoutCenter: ["50%", "50%"],
      layoutSize: model.detailLayoutSize,
      label: { show: false },
      itemStyle: {
        areaColor: "rgba(255, 255, 255, 0.06)",
        borderColor: "rgba(248, 247, 243, 0.9)",
        borderWidth: 0.8,
      },
      emphasis: { disabled: true },
      data: model.detailSelectedName ? [{
        name: model.detailSelectedName,
        itemStyle: {
          areaColor: MAP_COLORS.selected,
          borderColor: MAP_COLORS.selectedLine,
          borderWidth: 1.2,
        },
        label: {
          show: true,
          color: MAP_COLORS.selectedText,
          fontSize: 10,
          fontWeight: 600,
        },
      }] : [],
    }],
  };
}

export function LocationMap({
  location,
  active,
  detailed,
}: {
  location: string | null | undefined;
  active: boolean;
  detailed: boolean;
}) {
  const chartElementRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [model, setModel] = useState<MapModel | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const resolved = resolveChinaLocation(location);
  const city = resolved?.city;
  const regionAdcode = resolved?.regionAdcode;
  const regionName = resolved?.regionName;

  useEffect(() => {
    const element = chartElementRef.current;
    if (!active || !element || !regionAdcode || !regionName) return;

    let disposed = false;
    let observer: ResizeObserver | null = null;
    setStatus("loading");

    void Promise.all([
      import("echarts"),
      fetch("/map/geo/china.json").then((response) => {
        if (!response.ok) throw new Error("全国地图加载失败");
        return response.json() as Promise<GeoJSON>;
      }),
      fetch(`/map/geo/regions/${regionAdcode}.json`).then((response) => (
        response.ok ? response.json() as Promise<GeoJSON> : null
      )),
    ]).then(([echarts, chinaGeoJson, regionGeoJson]) => {
      if (disposed) return;

      const regionFeature = findFeature(
        chinaGeoJson,
        (properties) => String(properties.adcode) === regionAdcode,
      );
      const cityFeature = regionGeoJson && city && !municipalityAdcodes.has(regionAdcode)
        ? findFeature(regionGeoJson, (properties) => properties.name?.includes(city) === true)
        : null;
      const fallbackFeature = regionFeature || chinaGeoJson.features[0];
      const nationalSelectedName = (cityFeature || fallbackFeature).properties.name ?? regionName;
      const focusCenter = featureCenter(cityFeature || regionFeature || fallbackFeature);
      const nationalGeoJson: GeoJSON = cityFeature
        ? { ...chinaGeoJson, features: [...chinaGeoJson.features, cityFeature] }
        : chinaGeoJson;
      const nationalMapName = `profile-location-china-${regionAdcode}-${city ?? "region"}`;
      const detailMapName = regionGeoJson && !municipalityAdcodes.has(regionAdcode)
        ? `profile-location-region-${regionAdcode}`
        : null;
      const layoutSize = regionGeoJson ? detailLayoutSize(chinaGeoJson, regionGeoJson) : null;

      echarts.registerMap(nationalMapName, nationalGeoJson);
      if (regionGeoJson && detailMapName) echarts.registerMap(detailMapName, regionGeoJson);

      const chart = echarts.init(element, undefined, { renderer: "svg" });
      chartRef.current = chart;
      observer = new ResizeObserver(() => chart.resize());
      observer.observe(element);
      setModel({
        nationalMapName,
        detailMapName,
        nationalSelectedName,
        detailSelectedName: cityFeature?.properties.name ?? null,
        focusCenter,
        detailLayoutSize: layoutSize ?? "40%",
      });
      setStatus("ready");
    }).catch(() => {
      if (!disposed) setStatus("error");
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
      setModel(null);
    };
  }, [active, city, regionAdcode, regionName]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !model) return;
    const showDetail = detailed && Boolean(model.detailMapName);
    chart.setOption(mapOption(model, showDetail), true);
  }, [detailed, model]);

  const showDetail = detailed && Boolean(model?.detailMapName);
  const caption = status === "error"
    ? "地图暂不可用"
    : resolved
      ? `${showDetail ? resolved.regionName : "中国"} / ${resolved.city || resolved.regionName}`
      : "等待坐标";

  return (
    <figure className={styles.map} aria-label={location ? `${location} 行政区地图` : "中国地图"}>
      <div className={styles.chart} ref={chartElementRef} role="img" />
      {status === "loading" && <span className={styles.loading}>地图加载中</span>}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
