import type { Customer, FeatureImportance, Metrics, ModelPerformance, SegmentSummary } from "../types/customer";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  metrics: () => request<Metrics>("/dashboard/metrics"),
  customers: (params = "") => request<{ total: number; customers: Customer[] }>(`/customers${params}`),
  customer: (id: string) => request<Customer>(`/customers/${id}`),
  explanation: (id: string) => request<{ top_reasons: string[]; business_explanation: string }>(`/customers/${id}/churn-explanation`),
  recommendation: (id: string) => request<Record<string, string | number>>(`/customers/${id}/recommend-action`),
  segments: () => request<SegmentSummary[]>("/segments"),
  performance: () => request<ModelPerformance>("/model/performance"),
  importance: () => request<FeatureImportance[]>("/feature-importance"),
  revenueRisk: () => request<Record<string, unknown>>("/revenue-at-risk")
};
