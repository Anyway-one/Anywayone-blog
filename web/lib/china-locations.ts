export interface ResolvedChinaLocation {
  regionId: string;
  regionAdcode: string;
  regionName: string;
  city: string | null;
}

interface ChinaRegion {
  id: string;
  adcode: string;
  aliases: readonly string[];
}

interface ChinaCity {
  name: string;
  regionId: string;
}

const regions: readonly ChinaRegion[] = [
  { id: "CN-11", adcode: "110000", aliases: ["北京"] },
  { id: "CN-12", adcode: "120000", aliases: ["天津"] },
  { id: "CN-13", adcode: "130000", aliases: ["河北"] },
  { id: "CN-14", adcode: "140000", aliases: ["山西"] },
  { id: "CN-15", adcode: "150000", aliases: ["内蒙古"] },
  { id: "CN-21", adcode: "210000", aliases: ["辽宁"] },
  { id: "CN-22", adcode: "220000", aliases: ["吉林"] },
  { id: "CN-23", adcode: "230000", aliases: ["黑龙江"] },
  { id: "CN-31", adcode: "310000", aliases: ["上海"] },
  { id: "CN-32", adcode: "320000", aliases: ["江苏"] },
  { id: "CN-33", adcode: "330000", aliases: ["浙江"] },
  { id: "CN-34", adcode: "340000", aliases: ["安徽"] },
  { id: "CN-35", adcode: "350000", aliases: ["福建"] },
  { id: "CN-36", adcode: "360000", aliases: ["江西"] },
  { id: "CN-37", adcode: "370000", aliases: ["山东"] },
  { id: "CN-41", adcode: "410000", aliases: ["河南"] },
  { id: "CN-42", adcode: "420000", aliases: ["湖北"] },
  { id: "CN-43", adcode: "430000", aliases: ["湖南"] },
  { id: "CN-44", adcode: "440000", aliases: ["广东"] },
  { id: "CN-45", adcode: "450000", aliases: ["广西"] },
  { id: "CN-46", adcode: "460000", aliases: ["海南"] },
  { id: "CN-50", adcode: "500000", aliases: ["重庆"] },
  { id: "CN-51", adcode: "510000", aliases: ["四川"] },
  { id: "CN-52", adcode: "520000", aliases: ["贵州"] },
  { id: "CN-53", adcode: "530000", aliases: ["云南"] },
  { id: "CN-54", adcode: "540000", aliases: ["西藏"] },
  { id: "CN-61", adcode: "610000", aliases: ["陕西"] },
  { id: "CN-62", adcode: "620000", aliases: ["甘肃"] },
  { id: "CN-63", adcode: "630000", aliases: ["青海"] },
  { id: "CN-64", adcode: "640000", aliases: ["宁夏"] },
  { id: "CN-65", adcode: "650000", aliases: ["新疆"] },
  { id: "CN-71", adcode: "710000", aliases: ["台湾"] },
  { id: "CN-91", adcode: "810000", aliases: ["香港"] },
  { id: "CN-92", adcode: "820000", aliases: ["澳门"] },
] as const;

const cities: readonly ChinaCity[] = [
  { name: "北京", regionId: "CN-11" },
  { name: "天津", regionId: "CN-12" },
  { name: "石家庄", regionId: "CN-13" },
  { name: "太原", regionId: "CN-14" },
  { name: "呼和浩特", regionId: "CN-15" },
  { name: "沈阳", regionId: "CN-21" },
  { name: "大连", regionId: "CN-21" },
  { name: "长春", regionId: "CN-22" },
  { name: "哈尔滨", regionId: "CN-23" },
  { name: "上海", regionId: "CN-31" },
  { name: "南京", regionId: "CN-32" },
  { name: "苏州", regionId: "CN-32" },
  { name: "无锡", regionId: "CN-32" },
  { name: "常州", regionId: "CN-32" },
  { name: "杭州", regionId: "CN-33" },
  { name: "宁波", regionId: "CN-33" },
  { name: "温州", regionId: "CN-33" },
  { name: "合肥", regionId: "CN-34" },
  { name: "福州", regionId: "CN-35" },
  { name: "厦门", regionId: "CN-35" },
  { name: "泉州", regionId: "CN-35" },
  { name: "南昌", regionId: "CN-36" },
  { name: "济南", regionId: "CN-37" },
  { name: "青岛", regionId: "CN-37" },
  { name: "烟台", regionId: "CN-37" },
  { name: "郑州", regionId: "CN-41" },
  { name: "武汉", regionId: "CN-42" },
  { name: "长沙", regionId: "CN-43" },
  { name: "广州", regionId: "CN-44" },
  { name: "深圳", regionId: "CN-44" },
  { name: "东莞", regionId: "CN-44" },
  { name: "佛山", regionId: "CN-44" },
  { name: "珠海", regionId: "CN-44" },
  { name: "南宁", regionId: "CN-45" },
  { name: "桂林", regionId: "CN-45" },
  { name: "海口", regionId: "CN-46" },
  { name: "三亚", regionId: "CN-46" },
  { name: "重庆", regionId: "CN-50" },
  { name: "成都", regionId: "CN-51" },
  { name: "贵阳", regionId: "CN-52" },
  { name: "昆明", regionId: "CN-53" },
  { name: "拉萨", regionId: "CN-54" },
  { name: "西安", regionId: "CN-61" },
  { name: "兰州", regionId: "CN-62" },
  { name: "西宁", regionId: "CN-63" },
  { name: "银川", regionId: "CN-64" },
  { name: "乌鲁木齐", regionId: "CN-65" },
  { name: "台北", regionId: "CN-71" },
  { name: "香港", regionId: "CN-91" },
  { name: "澳门", regionId: "CN-92" },
] as const;

export function resolveChinaLocation(location: string | null | undefined): ResolvedChinaLocation | null {
  const normalized = location
    ?.replace(/[\s·,/，、-]/g, "")
    .replace(/壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|省|市/g, "") ?? "";
  if (!normalized) return null;

  const city = cities.find((item) => normalized.includes(item.name));
  if (city) {
    const region = regions.find((item) => item.id === city.regionId);
    if (!region) return null;
    return {
      regionId: city.regionId,
      regionAdcode: region.adcode,
      regionName: region.aliases[0],
      city: city.name,
    };
  }

  const region = regions.find((item) => item.aliases.some((alias) => normalized.includes(alias)));
  if (!region) return null;
  return {
    regionId: region.id,
    regionAdcode: region.adcode,
    regionName: region.aliases[0],
    city: null,
  };
}
