from __future__ import annotations

import numpy as np
import pandas as pd


def calculate_clv(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    contract_months = result["contract_type"].map({"Monthly": 8, "Annual": 18, "Two-Year": 30}).fillna(10)
    tenure_factor = np.clip(1 + result["tenure_months"] / 60, 1, 2.2)
    engagement_factor = np.clip(0.65 + result["engagement_score"] / 100, 0.65, 1.65)
    satisfaction_factor = np.clip(0.75 + result["satisfaction_score"] / 10, 0.85, 1.75)
    product_factor = np.clip(0.85 + result["number_of_products_used"] * 0.07, 0.9, 1.45)
    expected_remaining_months = np.clip(contract_months * tenure_factor * engagement_factor * satisfaction_factor, 3, 72)
    expected_monthly_revenue = result["monthly_revenue"] * product_factor
    retention_probability = 1 - result["churn_probability"]
    result["estimated_clv"] = (expected_monthly_revenue * expected_remaining_months * retention_probability).round(2)
    result["revenue_at_risk"] = (result["estimated_clv"] * result["churn_probability"]).round(2)
    result["potential_revenue_saved"] = (result["revenue_at_risk"] * 0.35).round(2)
    return result
