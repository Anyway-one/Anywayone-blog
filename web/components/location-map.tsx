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

function mapOption(mapName: string, selectedName: string | null, detailed: boolean) {
  return {
    animation: true,
    animationDurationUpdate: 360,
    tooltip: { show: false },
    series: [{
      type: "map",
      map: mapName,
      roam: false,
      silent: true,
      selectedMode: false,
      layoutCenter: ["50%", "50%"],
      layoutSize: detailed ? "108%" : "101%",
      label: {
        show: detailed,
        color: MAP_COLORS.text,
        fontSize: 9,
      },
      itemStyle: {
        areaColor: MAP_COLORS.base,
        borderColor: MAP_COLORS.line,
        borderWidth: 0.8,
      },
      emphasis: { disabled: true },
      data: selectedName ? [{
        name: selectedName,
        itemStyle: {
          areaColor: MAP_COLORS.selected,
          borderColor: MAP_COLORS.selectedLine,
          borderWidth: 1.2,
        },
        label: {
          show: true,
          color: MAP_COLORS.selectedText,
          fontSize: detailed ? 10 : 9,
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
      const nationalGeoJson: GeoJSON = cityFeature
        ? { ...chinaGeoJson, features: [...chinaGeoJson.features, cityFeature] }
        : chinaGeoJson;
      const nationalMapName = `profile-location-china-${regionAdcode}-${city ?? "region"}`;
      const detailMapName = regionGeoJson ? `profile-location-region-${regionAdcode}` : null;

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
    chart.setOption(mapOption(
      showDetail ? model.detailMapName! : model.nationalMapName,
      showDetail ? model.detailSelectedName : model.nationalSelectedName,
      showDetail,
    ), true);
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
