export type Customer = {
  customer_id: string;
  region: string;
  subscription_type: string;
  contract_type: string;
  monthly_revenue: number;
  satisfaction_score: number;
  nps_score: number;
  churn_probability: number;
  estimated_clv: number;
  revenue_at_risk: number;
  segment: string;
  recommended_action: string;
  priority_level: string;
  expected_revenue_saved: number;
  top_churn_reasons: string;
};

export type Metrics = {
  total_customers: number;
  predicted_churn_rate: number;
  high_risk_customers: number;
  total_monthly_recurring_revenue: number;
  total_estimated_clv: number;
  revenue_at_risk: number;
  expected_revenue_saved: number;
  average_satisfaction_score: number;
  average_nps_score: number;
};

export type SegmentSummary = {
  segment: string;
  customer_count: number;
  average_churn_probability: number;
  average_clv: number;
  revenue_at_risk: number;
  average_satisfaction_score: number;
  recommended_business_strategy: string;
};

export type ModelPerformance = {
  baseline_logistic_regression?: Record<string, number | number[][]>;
  main_xgboost_model?: Record<string, number | number[][]>;
  decision_threshold?: number;
  modeling_note?: string;
};

export type FeatureImportance = {
  feature: string;
  importance: number;
};
