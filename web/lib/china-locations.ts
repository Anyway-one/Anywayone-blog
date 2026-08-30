export interface ResolvedChinaLocation {
  regionId: string;
  city: string | null;
  marker: { x: number; y: number };
}

interface ChinaRegion {
  id: string;
  aliases: readonly string[];
  marker: readonly [longitude: number, latitude: number];
}

interface ChinaCity {
  name: string;
  regionId: string;
  longitude: number;
  latitude: number;
}

const MAP_GEO_BOUNDS = {
  west: 73.554302,
  north: 53.56178,
  east: 134.775703,
  south: 18.15506,
} as const;

const regions: readonly ChinaRegion[] = [
  { id: "CN-11", aliases: ["北京"], marker: [116.4074, 39.9042] },
  { id: "CN-12", aliases: ["天津"], marker: [117.2, 39.1333] },
  { id: "CN-13", aliases: ["河北"], marker: [114.5149, 38.0428] },
  { id: "CN-14", aliases: ["山西"], marker: [112.5492, 37.857] },
  { id: "CN-15", aliases: ["内蒙古"], marker: [111.7492, 40.8426] },
  { id: "CN-21", aliases: ["辽宁"], marker: [123.4315, 41.8057] },
  { id: "CN-22", aliases: ["吉林"], marker: [125.3235, 43.8171] },
  { id: "CN-23", aliases: ["黑龙江"], marker: [126.5349, 45.8038] },
  { id: "CN-31", aliases: ["上海"], marker: [121.4737, 31.2304] },
  { id: "CN-32", aliases: ["江苏"], marker: [118.7969, 32.0603] },
  { id: "CN-33", aliases: ["浙江"], marker: [120.1551, 30.2741] },
  { id: "CN-34", aliases: ["安徽"], marker: [117.2272, 31.8206] },
  { id: "CN-35", aliases: ["福建"], marker: [119.2965, 26.0745] },
  { id: "CN-36", aliases: ["江西"], marker: [115.8579, 28.6829] },
  { id: "CN-37", aliases: ["山东"], marker: [117.1201, 36.6512] },
  { id: "CN-41", aliases: ["河南"], marker: [113.6254, 34.7466] },
  { id: "CN-42", aliases: ["湖北"], marker: [114.3055, 30.5928] },
  { id: "CN-43", aliases: ["湖南"], marker: [112.9388, 28.2282] },
  { id: "CN-44", aliases: ["广东"], marker: [113.2644, 23.1291] },
  { id: "CN-45", aliases: ["广西"], marker: [108.3669, 22.817] },
  { id: "CN-46", aliases: ["海南"], marker: [110.1983, 20.044] },
  { id: "CN-50", aliases: ["重庆"], marker: [106.5516, 29.563] },
  { id: "CN-51", aliases: ["四川"], marker: [104.0665, 30.5728] },
  { id: "CN-52", aliases: ["贵州"], marker: [106.6302, 26.6477] },
  { id: "CN-53", aliases: ["云南"], marker: [102.8329, 24.8801] },
  { id: "CN-54", aliases: ["西藏"], marker: [91.1172, 29.6469] },
  { id: "CN-61", aliases: ["陕西"], marker: [108.9398, 34.3416] },
  { id: "CN-62", aliases: ["甘肃"], marker: [103.8343, 36.0611] },
  { id: "CN-63", aliases: ["青海"], marker: [101.7782, 36.6171] },
  { id: "CN-64", aliases: ["宁夏"], marker: [106.2309, 38.4872] },
  { id: "CN-65", aliases: ["新疆"], marker: [87.6168, 43.8256] },
  { id: "CN-71", aliases: ["台湾"], marker: [121.5654, 25.033] },
  { id: "CN-91", aliases: ["香港"], marker: [114.1694, 22.3193] },
  { id: "CN-92", aliases: ["澳门"], marker: [113.5439, 22.1987] },
] as const;

const cities: readonly ChinaCity[] = [
  { name: "北京", regionId: "CN-11", longitude: 116.4074, latitude: 39.9042 },
  { name: "天津", regionId: "CN-12", longitude: 117.2, latitude: 39.1333 },
  { name: "石家庄", regionId: "CN-13", longitude: 114.5149, latitude: 38.0428 },
  { name: "太原", regionId: "CN-14", longitude: 112.5492, latitude: 37.857 },
  { name: "呼和浩特", regionId: "CN-15", longitude: 111.7492, latitude: 40.8426 },
  { name: "沈阳", regionId: "CN-21", longitude: 123.4315, latitude: 41.8057 },
  { name: "大连", regionId: "CN-21", longitude: 121.6147, latitude: 38.914 },
  { name: "长春", regionId: "CN-22", longitude: 125.3235, latitude: 43.8171 },
  { name: "哈尔滨", regionId: "CN-23", longitude: 126.5349, latitude: 45.8038 },
  { name: "上海", regionId: "CN-31", longitude: 121.4737, latitude: 31.2304 },
  { name: "南京", regionId: "CN-32", longitude: 118.7969, latitude: 32.0603 },
  { name: "苏州", regionId: "CN-32", longitude: 120.5853, latitude: 31.2989 },
  { name: "无锡", regionId: "CN-32", longitude: 120.3119, latitude: 31.4912 },
  { name: "常州", regionId: "CN-32", longitude: 119.9741, latitude: 31.8112 },
  { name: "杭州", regionId: "CN-33", longitude: 120.1551, latitude: 30.2741 },
  { name: "宁波", regionId: "CN-33", longitude: 121.5503, latitude: 29.8746 },
  { name: "温州", regionId: "CN-33", longitude: 120.6994, latitude: 27.9943 },
  { name: "合肥", regionId: "CN-34", longitude: 117.2272, latitude: 31.8206 },
  { name: "福州", regionId: "CN-35", longitude: 119.2965, latitude: 26.0745 },
  { name: "厦门", regionId: "CN-35", longitude: 118.0894, latitude: 24.4798 },
  { name: "泉州", regionId: "CN-35", longitude: 118.6757, latitude: 24.8741 },
  { name: "南昌", regionId: "CN-36", longitude: 115.8579, latitude: 28.6829 },
  { name: "济南", regionId: "CN-37", longitude: 117.1201, latitude: 36.6512 },
  { name: "青岛", regionId: "CN-37", longitude: 120.3826, latitude: 36.0671 },
  { name: "烟台", regionId: "CN-37", longitude: 121.4479, latitude: 37.4638 },
  { name: "郑州", regionId: "CN-41", longitude: 113.6254, latitude: 34.7466 },
  { name: "武汉", regionId: "CN-42", longitude: 114.3055, latitude: 30.5928 },
  { name: "长沙", regionId: "CN-43", longitude: 112.9388, latitude: 28.2282 },
  { name: "广州", regionId: "CN-44", longitude: 113.2644, latitude: 23.1291 },
  { name: "深圳", regionId: "CN-44", longitude: 114.0579, latitude: 22.5431 },
  { name: "东莞", regionId: "CN-44", longitude: 113.7518, latitude: 23.0207 },
  { name: "佛山", regionId: "CN-44", longitude: 113.1214, latitude: 23.0215 },
  { name: "珠海", regionId: "CN-44", longitude: 113.5767, latitude: 22.2707 },
  { name: "南宁", regionId: "CN-45", longitude: 108.3669, latitude: 22.817 },
  { name: "桂林", regionId: "CN-45", longitude: 110.2902, latitude: 25.2736 },
  { name: "海口", regionId: "CN-46", longitude: 110.1983, latitude: 20.044 },
  { name: "三亚", regionId: "CN-46", longitude: 109.5121, latitude: 18.2528 },
  { name: "重庆", regionId: "CN-50", longitude: 106.5516, latitude: 29.563 },
  { name: "成都", regionId: "CN-51", longitude: 104.0665, latitude: 30.5728 },
  { name: "贵阳", regionId: "CN-52", longitude: 106.6302, latitude: 26.6477 },
  { name: "昆明", regionId: "CN-53", longitude: 102.8329, latitude: 24.8801 },
  { name: "拉萨", regionId: "CN-54", longitude: 91.1172, latitude: 29.6469 },
  { name: "西安", regionId: "CN-61", longitude: 108.9398, latitude: 34.3416 },
  { name: "兰州", regionId: "CN-62", longitude: 103.8343, latitude: 36.0611 },
  { name: "西宁", regionId: "CN-63", longitude: 101.7782, latitude: 36.6171 },
  { name: "银川", regionId: "CN-64", longitude: 106.2309, latitude: 38.4872 },
  { name: "乌鲁木齐", regionId: "CN-65", longitude: 87.6168, latitude: 43.8256 },
  { name: "台北", regionId: "CN-71", longitude: 121.5654, latitude: 25.033 },
  { name: "香港", regionId: "CN-91", longitude: 114.1694, latitude: 22.3193 },
  { name: "澳门", regionId: "CN-92", longitude: 113.5439, latitude: 22.1987 },
] as const;

function toMarker(longitude: number, latitude: number) {
  const x = ((longitude - MAP_GEO_BOUNDS.west) / (MAP_GEO_BOUNDS.east - MAP_GEO_BOUNDS.west)) * 100;
  const y = ((MAP_GEO_BOUNDS.north - latitude) / (MAP_GEO_BOUNDS.north - MAP_GEO_BOUNDS.south)) * 100;
  return { x, y };
}

export function resolveChinaLocation(location: string | null | undefined): ResolvedChinaLocation | null {
  const normalized = location?.replace(/[省市自治区特别行政区壮族回族维吾尔族\s·,/，、-]/g, "") ?? "";
  if (!normalized) return null;

  const city = cities.find((item) => normalized.includes(item.name));
  if (city) {
    return {
      regionId: city.regionId,
      city: city.name,
      marker: toMarker(city.longitude, city.latitude),
    };
  }

  const region = regions.find((item) => item.aliases.some((alias) => normalized.includes(alias)));
  if (!region) return null;
  return {
    regionId: region.id,
    city: null,
    marker: toMarker(...region.marker),
  };
}
