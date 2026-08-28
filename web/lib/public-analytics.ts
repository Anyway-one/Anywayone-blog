const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export interface VisitorTrendPoint {
  date: string;
  pageViews: number;
  visitors: number;
}

export interface VisitorStats {
  rangeDays: number;
  pageViews: number;
  visitors: number;
  todayPageViews: number;
  todayVisitors: number;
  trend: VisitorTrendPoint[];
}

interface DataResponse<T> {
  data: T;
}

export async function getPublicVisitorStats(days = 30): Promise<VisitorStats | null> {
  if (!configuredApiBaseUrl) return null;
  try {
    const response = await fetch(`${configuredApiBaseUrl}/analytics/public?days=${days}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = await response.json() as DataResponse<VisitorStats>;
    return body.data;
  } catch {
    return null;
  }
}

export async function recordPublicVisit(payload: Record<string, string | null>) {
  if (!configuredApiBaseUrl) return;
  try {
    await fetch(`${configuredApiBaseUrl}/analytics/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Analytics must never interrupt navigation.
  }
}
