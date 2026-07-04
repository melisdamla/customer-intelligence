from __future__ import annotations

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

SEGMENT_STRATEGIES = {
    "Loyal High-Value Customers": "Protect relationship quality, invite advocacy, and expand through premium capabilities.",
    "At-Risk High-Value Customers": "Assign senior customer success coverage and resolve blockers before renewal.",
    "New Low-Engagement Customers": "Trigger onboarding, training, and activation campaigns in the first lifecycle window.",
    "Price-Sensitive Customers": "Use targeted discounting, annual plan incentives, and value messaging.",
    "Support-Heavy Customers": "Prioritize support follow-up and root-cause product enablement.",
    "Growth Opportunity Customers": "Cross-sell relevant products and route qualified accounts to sales.",
    "Low-Value Stable Customers": "Maintain low-touch nurture and automated health monitoring.",
}


def _label(row: pd.Series) -> str:
    if row["estimated_clv"] >= row["clv_p70"] and row["churn_probability"] >= 0.5:
        return "At-Risk High-Value Customers"
    if row["estimated_clv"] >= row["clv_p70"] and row["churn_probability"] < 0.35:
        return "Loyal High-Value Customers"
    if row["tenure_months"] <= 6 and row["engagement_score"] < 45:
        return "New Low-Engagement Customers"
    if row["discount_used"] and row["monthly_revenue"] < row["mrr_p50"]:
        return "Price-Sensitive Customers"
    if row["support_pressure_score"] >= 45:
        return "Support-Heavy Customers"
    if row["engagement_score"] >= 55 and row["number_of_products_used"] <= 3 and row["churn_probability"] < 0.45:
        return "Growth Opportunity Customers"
    return "Low-Value Stable Customers"


def segment_customers(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    features = [
        "monthly_revenue",
        "tenure_months",
        "number_of_products_used",
        "engagement_score",
        "satisfaction_score",
        "churn_probability",
        "estimated_clv",
        "support_pressure_score",
    ]
    scaled = StandardScaler().fit_transform(result[features])
    result["cluster_id"] = KMeans(n_clusters=7, random_state=42, n_init=10).fit_predict(scaled)
    result["clv_p70"] = result["estimated_clv"].quantile(0.70)
    result["mrr_p50"] = result["monthly_revenue"].quantile(0.50)
    result["segment"] = result.apply(_label, axis=1)
    result["segment_strategy"] = result["segment"].map(SEGMENT_STRATEGIES)
    return result.drop(columns=["clv_p70", "mrr_p50"])


def summarize_segments(df: pd.DataFrame) -> pd.DataFrame:
    return (
        df.groupby("segment")
        .agg(
            customer_count=("customer_id", "count"),
            average_churn_probability=("churn_probability", "mean"),
            average_clv=("estimated_clv", "mean"),
            revenue_at_risk=("revenue_at_risk", "sum"),
            average_satisfaction_score=("satisfaction_score", "mean"),
            recommended_business_strategy=("segment_strategy", "first"),
        )
        .reset_index()
        .round(3)
    )
