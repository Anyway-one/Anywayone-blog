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
  nationalSelectedName: string;
  detailSelectedName: string | null;
  detailFeatureNames: string[];
  defaultCenter: [number, number];
  focusCenter: [number, number];
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

function featureCenter(feature: GeoFeature): [number, number] {
  const configuredCenter = feature.properties.center;
  if (Array.isArray(configuredCenter) && configuredCenter.length >= 2
      && typeof configuredCenter[0] === "number" && typeof configuredCenter[1] === "number") {
    return [configuredCenter[0], configuredCenter[1]];
  }
  const bounds = extendBounds([Infinity, Infinity, -Infinity, -Infinity], feature.geometry.coordinates);
  return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
}

function geoCenter(geoJson: GeoJSON): [number, number] {
  const bounds = geoJson.features.reduce(
    (result, feature) => extendBounds(result, feature.geometry.coordinates),
    [Infinity, Infinity, -Infinity, -Infinity] as Bounds,
  );
  return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
}

function mapOption(model: MapModel, detailed: boolean) {
  const detailBoundaries = model.detailFeatureNames.map((name) => ({
    name,
    itemStyle: name === model.detailSelectedName ? {
      areaColor: MAP_COLORS.selected,
      borderColor: MAP_COLORS.selectedLine,
      borderWidth: 1.2,
    } : detailed ? {
      areaColor: "rgba(255, 255, 255, 0.06)",
      borderColor: "rgba(248, 247, 243, 0.9)",
      borderWidth: 0.8,
    } : {
      areaColor: "transparent",
      borderColor: "transparent",
      borderWidth: 0,
    },
    label: name === model.detailSelectedName ? {
      show: true,
      color: MAP_COLORS.selectedText,
      fontSize: 10,
      fontWeight: 600,
    } : undefined,
  }));
  const nationalSelection = model.nationalSelectedName && !model.detailFeatureNames.includes(model.nationalSelectedName)
    ? [{
      name: model.nationalSelectedName,
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
    }]
    : [];
  const nationalSeries = {
    type: "map",
    map: model.nationalMapName,
    roam: false,
    silent: true,
    selectedMode: false,
    // The resting map sits lower in the card; the detailed state is moved to
    // the card center by the first hover stage before it is enlarged.
    layoutCenter: ["50%", detailed ? "50%" : "74%"],
    layoutSize: "145%",
    aspectScale: 0.8,
    center: detailed ? model.focusCenter : model.defaultCenter,
    zoom: detailed ? 1.8 : 1,
    label: { show: false },
    itemStyle: {
      areaColor: MAP_COLORS.base,
      borderColor: MAP_COLORS.line,
      borderWidth: 0.8,
    },
    emphasis: { disabled: true },
    data: [...detailBoundaries, ...nationalSelection],
  };

  return {
    animation: true,
    animationDurationUpdate: detailed ? 720 : 560,
    animationEasingUpdate: detailed ? "linear" as const : "cubicOut" as const,
    tooltip: { show: false },
    series: [nationalSeries],
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
      const detailFeatures = regionGeoJson?.features ?? [];
      const nationalGeoJson: GeoJSON = detailFeatures.length > 0
        ? { ...chinaGeoJson, features: [...chinaGeoJson.features, ...detailFeatures] }
        : chinaGeoJson;
      const nationalMapName = `profile-location-china-${regionAdcode}-${city ?? "region"}`;

      echarts.registerMap(nationalMapName, nationalGeoJson);

      const chart = echarts.init(element, undefined, { renderer: "svg" });
      chartRef.current = chart;
      observer = new ResizeObserver(() => chart.resize());
      observer.observe(element);
      setModel({
        nationalMapName,
        nationalSelectedName,
        detailSelectedName: cityFeature?.properties.name ?? null,
        detailFeatureNames: detailFeatures
          .map((feature) => feature.properties.name)
          .filter((name): name is string => Boolean(name)),
        defaultCenter: geoCenter(chinaGeoJson),
        focusCenter,
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
    const showDetail = detailed && model.detailFeatureNames.length > 0;
    if (!showDetail) {
      chart.setOption(mapOption(model, false), false);
      return;
    }

    // The hover motion is deliberately staged: center first, zoom and city borders second.
    chart.setOption({
      animation: true,
      animationDurationUpdate: 360,
      animationEasingUpdate: "cubicOut" as const,
      series: [{ center: model.focusCenter, zoom: 1, layoutCenter: ["50%", "50%"] }],
    }, false);
    const timer = window.setTimeout(() => {
      if (chartRef.current === chart) chart.setOption(mapOption(model, true), false);
    }, 380);
    return () => window.clearTimeout(timer);
  }, [detailed, model]);

  return (
    <figure className={styles.map} aria-label={location ? `${location} 行政区地图` : "中国地图"}>
      <div className={styles.chart} ref={chartElementRef} role="img" />
      {status === "loading" && <span className={styles.loading}>地图加载中</span>}
    </figure>
  );
}
