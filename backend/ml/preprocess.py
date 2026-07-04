from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


TARGET = "churn"
ID_COLUMNS = ["customer_id"]
CATEGORICAL_COLUMNS = [
    "gender",
    "region",
    "acquisition_channel",
    "subscription_type",
    "contract_type",
    "payment_method",
    "customer_age_group",
    "tenure_group",
]


def add_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    enriched = df.copy()
    enriched["engagement_score"] = np.clip(
        enriched["number_of_logins_last_30_days"] / 80 * 35
        + enriched["average_session_duration"] / 95 * 15
        + enriched["feature_usage_score"] / 100 * 30
        + enriched["marketing_email_open_rate"] * 10
        + enriched["campaign_click_rate"] * 10,
        0,
        100,
    ).round(2)
    enriched["support_pressure_score"] = np.clip(
        enriched["support_tickets_last_90_days"] * 8 + enriched["unresolved_tickets"] * 18 + (10 - enriched["satisfaction_score"]) * 4,
        0,
        100,
    ).round(2)
    enriched["payment_risk_score"] = np.clip(enriched["late_payments"] * 18 + enriched["discount_used"].astype(int) * 8, 0, 100).round(2)
    enriched["revenue_per_product"] = (enriched["monthly_revenue"] / enriched["number_of_products_used"].replace(0, 1)).round(2)
    enriched["customer_age_group"] = pd.cut(enriched["age"], bins=[17, 29, 44, 59, 90], labels=["18-29", "30-44", "45-59", "60+"]).astype(str)
    enriched["tenure_group"] = pd.cut(enriched["tenure_months"], bins=[0, 6, 18, 36, 120], labels=["New", "Developing", "Established", "Long-Term"]).astype(str)
    enriched["renewal_risk_flag"] = enriched["renewal_due_in_days"] <= 45
    enriched["high_value_customer_flag"] = enriched["monthly_revenue"] >= enriched["monthly_revenue"].quantile(0.75)
    return enriched


def build_preprocessor(df: pd.DataFrame) -> tuple[ColumnTransformer, list[str], list[str]]:
    feature_columns = [column for column in df.columns if column not in ID_COLUMNS + [TARGET]]
    categorical_columns = [column for column in CATEGORICAL_COLUMNS if column in feature_columns]
    numerical_columns = [column for column in feature_columns if column not in categorical_columns]
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )
    numerical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numerical_pipeline, numerical_columns),
            ("cat", categorical_pipeline, categorical_columns),
        ]
    )
    return preprocessor, feature_columns, numerical_columns + categorical_columns
