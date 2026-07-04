from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"


def sigmoid(value: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-value))


def generate_customer_data(n_customers: int = 15_000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    customer_id = [f"CUST-{i:06d}" for i in range(1, n_customers + 1)]
    age = np.clip(rng.normal(42, 13, n_customers).round(), 18, 78).astype(int)
    gender = rng.choice(["Female", "Male", "Non-binary", "Prefer not to say"], n_customers, p=[0.47, 0.46, 0.04, 0.03])
    region = rng.choice(["North America", "Europe", "Asia Pacific", "Latin America", "Middle East & Africa"], n_customers, p=[0.37, 0.29, 0.2, 0.09, 0.05])
    acquisition_channel = rng.choice(["Organic Search", "Paid Search", "Partner", "Referral", "Outbound Sales", "Social"], n_customers, p=[0.24, 0.2, 0.16, 0.18, 0.14, 0.08])
    subscription_type = rng.choice(["Basic", "Professional", "Business", "Enterprise"], n_customers, p=[0.33, 0.34, 0.23, 0.10])
    contract_type = rng.choice(["Monthly", "Annual", "Two-Year"], n_customers, p=[0.5, 0.38, 0.12])
    tenure_months = np.clip(rng.gamma(3.2, 9.5, n_customers).round(), 1, 96).astype(int)

    subscription_base = pd.Series(subscription_type).map({"Basic": 45, "Professional": 115, "Business": 310, "Enterprise": 920}).to_numpy()
    contract_multiplier = pd.Series(contract_type).map({"Monthly": 1.0, "Annual": 1.18, "Two-Year": 1.35}).to_numpy()
    monthly_revenue = np.maximum(15, rng.normal(subscription_base * contract_multiplier, subscription_base * 0.22)).round(2)
    number_of_products_used = np.clip(rng.poisson(pd.Series(subscription_type).map({"Basic": 1.3, "Professional": 2.4, "Business": 3.6, "Enterprise": 5.2}).to_numpy()) + 1, 1, 8)

    number_of_logins_last_30_days = np.clip(rng.normal(8 + number_of_products_used * 3.2 + tenure_months * 0.06, 7, n_customers).round(), 0, 80).astype(int)
    average_session_duration = np.clip(rng.normal(14 + number_of_products_used * 4.5, 9, n_customers), 1, 95).round(2)
    feature_usage_score = np.clip((number_of_logins_last_30_days / 60 * 45) + (average_session_duration / 95 * 25) + (number_of_products_used / 8 * 30) + rng.normal(0, 8, n_customers), 0, 100).round(2)

    support_tickets_last_90_days = np.clip(rng.poisson(1.2 + (100 - feature_usage_score) / 35), 0, 15)
    unresolved_tickets = np.minimum(support_tickets_last_90_days, rng.poisson(support_tickets_last_90_days * 0.28))
    late_payments = np.clip(rng.poisson(0.25 + (contract_type == "Monthly") * 0.25 + (subscription_type == "Basic") * 0.15), 0, 6)
    discount_used = rng.random(n_customers) < pd.Series(subscription_type).map({"Basic": 0.36, "Professional": 0.28, "Business": 0.2, "Enterprise": 0.12}).to_numpy()
    payment_method = rng.choice(["Credit Card", "ACH", "Invoice", "PayPal"], n_customers, p=[0.48, 0.24, 0.2, 0.08])

    satisfaction_score = np.clip(8.4 - support_tickets_last_90_days * 0.35 - unresolved_tickets * 0.62 + feature_usage_score / 100 * 1.6 + rng.normal(0, 1.15, n_customers), 1, 10).round(1)
    nps_score = np.clip(((satisfaction_score - 5.5) * 18 + rng.normal(0, 16, n_customers)).round(), -100, 100).astype(int)
    last_interaction_days_ago = np.clip(rng.exponential(18 + np.maximum(0, 45 - number_of_logins_last_30_days) * 0.65, n_customers).round(), 0, 180).astype(int)
    marketing_email_open_rate = np.clip(rng.beta(2.2 + feature_usage_score / 35, 5.0, n_customers), 0, 1).round(3)
    campaign_click_rate = np.clip(marketing_email_open_rate * rng.beta(1.5, 6.5, n_customers), 0, 1).round(3)
    customer_success_calls = np.clip(rng.poisson(0.6 + (subscription_type == "Enterprise") * 2.0 + (subscription_type == "Business") * 1.0), 0, 12)
    renewal_due_in_days = rng.integers(1, 366, n_customers)

    engagement = (number_of_logins_last_30_days / 80 * 35) + (feature_usage_score / 100 * 35) + (marketing_email_open_rate * 15) + (campaign_click_rate * 15)
    churn_logit = (
        -2.1
        - feature_usage_score * 0.018
        - number_of_products_used * 0.18
        - satisfaction_score * 0.24
        - nps_score * 0.006
        - customer_success_calls * 0.12
        + support_tickets_last_90_days * 0.13
        + unresolved_tickets * 0.38
        + late_payments * 0.35
        + (tenure_months < 6) * 0.72
        + (renewal_due_in_days < 45) * 0.46
        + (contract_type == "Monthly") * 0.54
        - (contract_type == "Two-Year") * 0.55
        + (last_interaction_days_ago > 45) * 0.42
        - engagement * 0.011
        + rng.normal(0, 0.45, n_customers)
    )
    churn_probability = sigmoid(churn_logit)
    churn = (rng.random(n_customers) < churn_probability).astype(int)

    df = pd.DataFrame(
        {
            "customer_id": customer_id,
            "age": age,
            "gender": gender,
            "region": region,
            "acquisition_channel": acquisition_channel,
            "subscription_type": subscription_type,
            "contract_type": contract_type,
            "tenure_months": tenure_months,
            "monthly_revenue": monthly_revenue,
            "total_revenue": (monthly_revenue * tenure_months).round(2),
            "number_of_products_used": number_of_products_used,
            "number_of_logins_last_30_days": number_of_logins_last_30_days,
            "average_session_duration": average_session_duration,
            "feature_usage_score": feature_usage_score,
            "support_tickets_last_90_days": support_tickets_last_90_days,
            "unresolved_tickets": unresolved_tickets,
            "late_payments": late_payments,
            "discount_used": discount_used,
            "payment_method": payment_method,
            "satisfaction_score": satisfaction_score,
            "nps_score": nps_score,
            "last_interaction_days_ago": last_interaction_days_ago,
            "marketing_email_open_rate": marketing_email_open_rate,
            "campaign_click_rate": campaign_click_rate,
            "customer_success_calls": customer_success_calls,
            "renewal_due_in_days": renewal_due_in_days,
            "churn": churn,
        }
    )
    return df


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df = generate_customer_data()
    df.to_csv(DATA_DIR / "customers_raw.csv", index=False)
    print(f"Generated {len(df):,} customers at {DATA_DIR / 'customers_raw.csv'}")


if __name__ == "__main__":
    main()
