import { apiRequest } from './http'

export interface VisitorTrendPoint {
  date: string
  pageViews: number
  visitors: number
}

export interface VisitorBreakdownItem {
  name: string
  count: number
  percentage: number
}

export interface VisitorAdminStats {
  rangeDays: number
  pageViews: number
  visitors: number
  todayPageViews: number
  todayVisitors: number
  trend: VisitorTrendPoint[]
  locations: VisitorBreakdownItem[]
  countries: VisitorBreakdownItem[]
  referrers: VisitorBreakdownItem[]
  devices: VisitorBreakdownItem[]
  pages: VisitorBreakdownItem[]
}

interface DataResponse<T> { data: T }

export async function getVisitorAnalytics(days = 30) {
  const response = await apiRequest<DataResponse<VisitorAdminStats>>(`/analytics/admin?days=${days}`)
  return response.data
}
