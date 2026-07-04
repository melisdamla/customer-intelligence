from __future__ import annotations

import pandas as pd


def business_reasons(row: pd.Series) -> str:
    reasons: list[tuple[float, str]] = []
    reasons.append((max(0, 10 - row["satisfaction_score"]) / 10, "Low satisfaction score"))
    reasons.append((max(0, 35 - row["number_of_logins_last_30_days"]) / 35, "Low login activity"))
    reasons.append((row["support_tickets_last_90_days"] / 12, "Many support tickets"))
    reasons.append((row["unresolved_tickets"] / 6, "Unresolved support tickets"))
    reasons.append((max(0, 8 - row["tenure_months"]) / 8, "Short tenure"))
    reasons.append((1 if row["renewal_due_in_days"] <= 45 else 0, "Renewal date approaching soon"))
    reasons.append((row["late_payments"] / 5, "High number of late payments"))
    reasons.append((max(0, 4 - row["number_of_products_used"]) / 4, "Low product usage"))
    reasons.append((max(0, 0.35 - row["marketing_email_open_rate"]) / 0.35, "Low marketing engagement"))
    reasons.append((row["engagement_score"] / 100 if row["engagement_score"] >= 65 else 0, "Strong engagement lowers risk"))
    reasons.append((row["satisfaction_score"] / 10 if row["satisfaction_score"] >= 8 else 0, "High satisfaction lowers risk"))
    selected = [reason for _, reason in sorted(reasons, reverse=True)[:5]]
    return "; ".join(selected)
