from __future__ import annotations

import pandas as pd


ACTION_COSTS = {
    "assign customer success manager": 450,
    "offer personalized discount": 220,
    "send re-engagement campaign": 35,
    "offer product training": 160,
    "prioritize support follow-up": 120,
    "offer loyalty reward": 90,
    "propose annual plan upgrade": 80,
    "send renewal reminder": 25,
    "cross-sell relevant product": 70,
    "no action needed": 0,
}


def _priority(churn_probability: float, estimated_clv: float, revenue_at_risk: float) -> str:
    if churn_probability >= 0.75 and revenue_at_risk >= 2500:
        return "Critical"
    if churn_probability >= 0.55 or revenue_at_risk >= 1500:
        return "High"
    if churn_probability >= 0.35 or estimated_clv >= 5000:
        return "Medium"
    return "Low"


def _choose_action(row: pd.Series) -> tuple[str, str, float]:
    if row["churn_probability"] >= 0.6 and row["estimated_clv"] >= row["estimated_clv_p70"]:
        return "assign customer success manager", "High-value account with elevated churn risk needs proactive executive retention coverage.", 0.38
    if row["support_pressure_score"] >= 45:
        return "prioritize support follow-up", "Support friction is a major churn driver and should be resolved before commercial outreach.", 0.32
    if row["engagement_score"] < 40:
        return "send re-engagement campaign", "Usage and marketing engagement are weak, so a low-cost activation journey is appropriate.", 0.22
    if row["satisfaction_score"] < 6.5:
        return "offer product training", "Customer sentiment is low and training can improve product confidence.", 0.28
    if row["payment_risk_score"] >= 35 or row["discount_used"]:
        return "offer personalized discount", "Payment or price sensitivity signals suggest a targeted commercial save offer.", 0.24
    if row["renewal_due_in_days"] <= 45:
        return "send renewal reminder", "Renewal is approaching and the account needs timely confirmation.", 0.18
    if row["segment"] == "Growth Opportunity Customers":
        return "cross-sell relevant product", "Healthy engagement with limited product breadth creates expansion potential.", 0.2
    if row["segment"] == "Loyal High-Value Customers":
        return "offer loyalty reward", "The account is valuable and loyal, so recognition can strengthen advocacy.", 0.14
    if row["contract_type"] == "Monthly" and row["churn_probability"] < 0.45:
        return "propose annual plan upgrade", "Stable monthly customers can be converted into more durable annual revenue.", 0.16
    return "no action needed", "Customer health is stable enough for normal monitoring.", 0.05


def recommend_actions(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    result["estimated_clv_p70"] = result["estimated_clv"].quantile(0.70)
    rows = []
    for _, row in result.iterrows():
        action, explanation, success_probability = _choose_action(row)
        cost = ACTION_COSTS[action]
        revenue_impact = row["estimated_clv"] * success_probability
        saved = row["churn_probability"] * row["estimated_clv"] * success_probability - cost
        rows.append(
            {
                "recommended_action": action,
                "recommendation_explanation": explanation,
                "priority_level": _priority(row["churn_probability"], row["estimated_clv"], row["revenue_at_risk"]),
                "estimated_action_cost": cost,
                "expected_success_probability": round(success_probability, 2),
                "expected_revenue_impact": round(revenue_impact, 2),
                "expected_revenue_saved": round(max(saved, 0), 2),
            }
        )
    return pd.concat([result.drop(columns=["estimated_clv_p70"]), pd.DataFrame(rows, index=result.index)], axis=1)
