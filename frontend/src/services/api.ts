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
  revenueRisk: () => request<Record<string, unknown>>("/revenue-at-risk"),
  uploadData: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE}/data/upload`, { method: "POST", body: formData });
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  },
  batchScore: (uploadId: string) => request<Record<string, unknown>>(`/batch-score/${uploadId}`),
  retrainingSchedule: () => request<Record<string, unknown>>("/retraining/schedule"),
  setRetrainingSchedule: async (payload: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE}/retraining/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Schedule update failed: ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  },
  runRetraining: async () => {
    const response = await fetch(`${API_BASE}/retraining/run`, { method: "POST" });
    if (!response.ok) throw new Error(`Retraining failed: ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  },
  crmSync: async (payload: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE}/integrations/crm/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`CRM sync failed: ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  },
  crmSyncs: () => request<Record<string, unknown>[]>("/integrations/crm/syncs"),
  monitoring: () => request<Record<string, unknown>>("/monitoring/model"),
  mlflowRuns: () => request<Record<string, unknown>[]>("/mlflow/runs"),
  abTests: () => request<Record<string, unknown>[]>("/experiments/ab-tests"),
  createAbTest: async (payload: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE}/experiments/ab-tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`A/B test analysis failed: ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  },
  upliftModel: () => request<Record<string, unknown>>("/uplift/model"),
  operationsUpload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE}/operations/upload`, { method: "POST", body: formData });
    if (!response.ok) throw new Error(`Operations upload failed: ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  },
  operationsValidate: async (payload: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE}/operations/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Operations validation failed: ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  },
  operationsBatchScore: async (payload: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE}/operations/batch-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Operations batch scoring failed: ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  },
  operationsSchema: () => request<Record<string, unknown>>("/operations/schema"),
  operationsValidationSummary: () => request<Record<string, unknown>>("/operations/validation-summary"),
  operationsScoringPreview: () => request<Record<string, unknown>>("/operations/scoring-preview"),
  operationsCrmSync: async (payload: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE}/operations/crm-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Operations CRM sync failed: ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  },
  operationsCrmStatus: () => request<Record<string, unknown>>("/operations/crm-sync/status"),
  operationsRetrain: async () => {
    const response = await fetch(`${API_BASE}/operations/retrain`, { method: "POST" });
    if (!response.ok) throw new Error(`Operations retraining failed: ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  },
  operationsRetrainingStatus: () => request<Record<string, unknown>>("/operations/retraining/status"),
  operationsDataQualityAlerts: () => request<Record<string, string>[]>("/operations/data-quality-alerts")
};
