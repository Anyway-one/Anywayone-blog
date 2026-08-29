import { cache } from "react";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export type ServiceCondition = "operational" | "unavailable";

export interface PublicSystemStatus {
  overall: "operational" | "degraded";
  api: ServiceCondition;
  database: ServiceCondition;
  checkedAt: string;
}

interface HealthResponse {
  data?: {
    status?: "ok" | "unavailable";
    database?: "ok" | "unavailable";
  };
}

function unavailableStatus(): PublicSystemStatus {
  return {
    overall: "degraded",
    api: "unavailable",
    database: "unavailable",
    checkedAt: new Date().toISOString(),
  };
}

export const getPublicSystemStatus = cache(async (): Promise<PublicSystemStatus> => {
  if (!configuredApiBaseUrl) return unavailableStatus();

  try {
    const healthUrl = new URL(configuredApiBaseUrl);
    healthUrl.pathname = "/health/ready";
    healthUrl.search = "";
    const response = await fetch(healthUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30, tags: ["public-system-status"] },
    });
    const body = await response.json() as HealthResponse;
    const api = response.ok && body.data?.status === "ok" ? "operational" : "unavailable";
    const database = response.ok && body.data?.database === "ok" ? "operational" : "unavailable";
    return {
      overall: api === "operational" && database === "operational" ? "operational" : "degraded",
      api,
      database,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return unavailableStatus();
  }
});
