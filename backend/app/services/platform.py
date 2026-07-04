from __future__ import annotations

import json
import math
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import joblib
import numpy as np
import pandas as pd
from fastapi import HTTPException, UploadFile

from ml.clv_model import calculate_clv
from ml.explainability import business_reasons
from ml.preprocess import TARGET, add_derived_features
from ml.recommendation_engine import recommend_actions
from ml.segmentation import segment_customers

BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_DIR / "data"
ARTIFACTS_DIR = BACKEND_DIR / "artifacts"
UPLOAD_DIR = DATA_DIR / "uploads"
BATCH_DIR = DATA_DIR / "batch_scores"
PLATFORM_DIR = ARTIFACTS_DIR / "platform"
MODEL_PATH = ARTIFACTS_DIR / "churn_xgboost_model.joblib"

REQUIRED_UPLOAD_COLUMNS = {
    "customer_id",
    "age",
    "gender",
    "region",
    "acquisition_channel",
    "subscription_type",
    "contract_type",
    "tenure_months",
    "monthly_revenue",
    "total_revenue",
    "number_of_products_used",
    "number_of_logins_last_30_days",
    "average_session_duration",
    "feature_usage_score",
    "support_tickets_last_90_days",
    "unresolved_tickets",
    "late_payments",
    "discount_used",
    "payment_method",
    "satisfaction_score",
    "nps_score",
    "last_interaction_days_ago",
    "marketing_email_open_rate",
    "campaign_click_rate",
    "customer_success_calls",
    "renewal_due_in_days",
}


def _ensure_dirs() -> None:
    for path in [UPLOAD_DIR, BATCH_DIR, PLATFORM_DIR]:
        path.mkdir(parents=True, exist_ok=True)


def _read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _write_json(path: Path, payload: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, default=str))


def _read_dataset(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(path)
    if suffix in {".xlsx", ".xls"}:
        return pd.read_excel(path)
    raise HTTPException(status_code=400, detail="Upload must be a CSV or Excel file")


def save_upload(file: UploadFile) -> dict:
    _ensure_dirs()
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".csv", ".xlsx", ".xls"}:
        raise HTTPException(status_code=400, detail="Upload must be a CSV or Excel file")

    upload_id = f"upload-{uuid4().hex[:10]}"
    path = UPLOAD_DIR / f"{upload_id}{suffix}"
    with path.open("wb") as handle:
        shutil.copyfileobj(file.file, handle)

    df = _read_dataset(path)
    missing = sorted(REQUIRED_UPLOAD_COLUMNS - set(df.columns))
    if missing:
        raise HTTPException(status_code=400, detail={"message": "Upload is missing required columns", "missing_columns": missing})

    metadata = {
        "upload_id": upload_id,
        "filename": file.filename,
        "stored_path": str(path),
        "rows": int(len(df)),
        "columns": list(df.columns),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "status": "validated",
    }
    _write_json(PLATFORM_DIR / f"{upload_id}.json", metadata)
    return metadata


def score_uploaded_batch(upload_id: str) -> dict:
    _ensure_dirs()
    upload_meta = _read_json(PLATFORM_DIR / f"{upload_id}.json", None)
    if not upload_meta:
        raise HTTPException(status_code=404, detail=f"Upload {upload_id} not found")
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=409, detail="Churn model artifact is missing. Run the training pipeline first.")

    source_path = Path(upload_meta["stored_path"])
    df = _read_dataset(source_path)
    enriched = add_derived_features(df)
    x = enriched.drop(columns=[TARGET, "customer_id"], errors="ignore")
    model = joblib.load(MODEL_PATH)
    scored = enriched.copy()
    scored["churn_probability"] = model.predict_proba(x)[:, 1].round(4)
    if TARGET not in scored.columns:
        scored[TARGET] = (scored["churn_probability"] >= 0.25).astype(int)
    scored = calculate_clv(scored)
    scored = segment_customers(scored)
    scored["top_churn_reasons"] = scored.apply(business_reasons, axis=1)
    scored = recommend_actions(scored)

    batch_id = f"batch-{uuid4().hex[:10]}"
    output_path = BATCH_DIR / f"{batch_id}.csv"
    scored.to_csv(output_path, index=False)
    summary = {
        "batch_id": batch_id,
        "upload_id": upload_id,
        "rows_scored": int(len(scored)),
        "output_path": str(output_path),
        "average_churn_probability": round(float(scored["churn_probability"].mean()), 4),
        "high_risk_customers": int((scored["churn_probability"] >= 0.55).sum()),
        "revenue_at_risk": round(float(scored["revenue_at_risk"].sum()), 2),
        "expected_revenue_saved": round(float(scored["expected_revenue_saved"].sum()), 2),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_json(PLATFORM_DIR / f"{batch_id}.json", summary)
    return summary


def configure_retraining(cadence: str = "weekly", lookback_days: int = 90, metric_guardrail: float = 0.78) -> dict:
    now = datetime.now(timezone.utc)
    days = {"daily": 1, "weekly": 7, "monthly": 30}.get(cadence, 7)
    payload = {
        "cadence": cadence,
        "lookback_days": lookback_days,
        "metric_guardrail_roc_auc": metric_guardrail,
        "next_run_at": (now + timedelta(days=days)).isoformat(),
        "last_run_at": None,
        "status": "scheduled",
        "updated_at": now.isoformat(),
    }
    _write_json(PLATFORM_DIR / "retraining_schedule.json", payload)
    return payload


def retraining_status() -> dict:
    return _read_json(PLATFORM_DIR / "retraining_schedule.json", configure_retraining())


def run_retraining_job() -> dict:
    from ml.train_churn_model import run_pipeline

    run_pipeline()
    metrics = _read_json(ARTIFACTS_DIR / "model_metrics.json", {})
    schedule = retraining_status()
    schedule["last_run_at"] = datetime.now(timezone.utc).isoformat()
    schedule["status"] = "completed"
    _write_json(PLATFORM_DIR / "retraining_schedule.json", schedule)
    log_mlflow_run("scheduled-retraining", metrics.get("main_xgboost_model", {}), {"trigger": "manual-api"})
    return {"status": "completed", "schedule": schedule, "metrics": metrics}


def crm_sync(payload: dict) -> dict:
    account_count = int(payload.get("account_count", 250))
    provider = payload.get("provider", "Salesforce")
    synced = max(0, account_count - int(account_count * 0.03))
    result = {
        "sync_id": f"crm-{uuid4().hex[:10]}",
        "provider": provider,
        "objects": payload.get("objects", ["accounts", "opportunities", "support_cases"]),
        "accounts_received": account_count,
        "accounts_matched": synced,
        "match_rate": round(synced / max(account_count, 1), 3),
        "status": "completed",
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }
    history = _read_json(PLATFORM_DIR / "crm_sync_history.json", [])
    history.insert(0, result)
    _write_json(PLATFORM_DIR / "crm_sync_history.json", history[:25])
    return result


def crm_history() -> list[dict]:
    return _read_json(PLATFORM_DIR / "crm_sync_history.json", [])


def monitoring_report() -> dict:
    current_path = DATA_DIR / "customer_intelligence.csv"
    baseline = _read_json(ARTIFACTS_DIR / "baseline_stats.json", {})
    if not current_path.exists():
        raise HTTPException(status_code=404, detail="Current customer intelligence dataset not found")
    current = pd.read_csv(current_path)
    monitored = ["monthly_revenue", "engagement_score", "support_pressure_score", "satisfaction_score", "churn_probability"]
    drift_rows = []
    for feature in monitored:
        current_mean = float(current[feature].mean())
        base_mean = float(baseline.get(feature, {}).get("mean", current_mean))
        base_std = float(baseline.get(feature, {}).get("std", current[feature].std() or 1))
        z_score = abs(current_mean - base_mean) / max(base_std, 1e-6)
        drift_rows.append(
            {
                "feature": feature,
                "baseline_mean": round(base_mean, 4),
                "current_mean": round(current_mean, 4),
                "drift_score": round(float(z_score), 4),
                "status": "watch" if z_score >= 0.35 else "stable",
            }
        )
    risk_rate = float((current["churn_probability"] >= 0.55).mean())
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "population_size": int(len(current)),
        "high_risk_rate": round(risk_rate, 4),
        "data_drift": drift_rows,
        "alerts": [row for row in drift_rows if row["status"] == "watch"],
        "service_health": "healthy",
    }
    _write_json(PLATFORM_DIR / "latest_monitoring_report.json", report)
    return report


def log_mlflow_run(run_name: str, metrics: dict, params: dict | None = None) -> dict:
    runs = _read_json(PLATFORM_DIR / "mlflow_runs.json", [])
    run = {
        "run_id": f"run-{uuid4().hex[:10]}",
        "run_name": run_name,
        "experiment_name": "enterprise-customer-intelligence",
        "metrics": metrics,
        "params": params or {},
        "artifact_uri": str(ARTIFACTS_DIR),
        "status": "FINISHED",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    runs.insert(0, run)
    _write_json(PLATFORM_DIR / "mlflow_runs.json", runs[:50])
    return run


def mlflow_runs() -> list[dict]:
    runs = _read_json(PLATFORM_DIR / "mlflow_runs.json", [])
    if runs:
        return runs
    metrics = _read_json(ARTIFACTS_DIR / "model_metrics.json", {})
    return [log_mlflow_run("initial-xgboost-training", metrics.get("main_xgboost_model", {}), {"source": "bootstrap"})]


def analyze_ab_test(payload: dict) -> dict:
    control_customers = int(payload.get("control_customers", 1200))
    treatment_customers = int(payload.get("treatment_customers", 1200))
    control_retention = float(payload.get("control_retention_rate", 0.72))
    treatment_retention = float(payload.get("treatment_retention_rate", 0.78))
    avg_clv = float(payload.get("average_clv", 4200))
    action_cost = float(payload.get("action_cost_per_customer", 55))
    uplift = treatment_retention - control_retention
    incremental_retained = uplift * treatment_customers
    incremental_revenue = incremental_retained * avg_clv - treatment_customers * action_cost
    pooled = (control_retention * control_customers + treatment_retention * treatment_customers) / max(control_customers + treatment_customers, 1)
    stderr = math.sqrt(max(pooled * (1 - pooled) * (1 / control_customers + 1 / treatment_customers), 1e-9))
    z_score = uplift / stderr
    result = {
        "experiment_id": f"exp-{uuid4().hex[:10]}",
        "name": payload.get("name", "Retention next-best-action test"),
        "control_retention_rate": round(control_retention, 4),
        "treatment_retention_rate": round(treatment_retention, 4),
        "absolute_uplift": round(uplift, 4),
        "relative_uplift": round(uplift / max(control_retention, 1e-6), 4),
        "incremental_customers_retained": round(incremental_retained, 1),
        "incremental_revenue": round(incremental_revenue, 2),
        "z_score": round(z_score, 3),
        "decision": "ship treatment" if uplift > 0 and z_score >= 1.96 else "continue test",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    history = _read_json(PLATFORM_DIR / "ab_tests.json", [])
    history.insert(0, result)
    _write_json(PLATFORM_DIR / "ab_tests.json", history[:25])
    return result


def ab_test_history() -> list[dict]:
    return _read_json(PLATFORM_DIR / "ab_tests.json", [])


def uplift_model_report() -> dict:
    path = DATA_DIR / "customer_intelligence.csv"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Customer intelligence dataset not found")
    df = pd.read_csv(path)
    action_success_lift = df["recommended_action"].map(
        {
            "assign customer success manager": 0.18,
            "prioritize support follow-up": 0.15,
            "send re-engagement campaign": 0.09,
            "offer product training": 0.12,
            "offer personalized discount": 0.1,
            "send renewal reminder": 0.06,
            "cross-sell relevant product": 0.05,
            "offer loyalty reward": 0.04,
            "propose annual plan upgrade": 0.05,
            "no action needed": 0.0,
        }
    ).fillna(0.03)
    df["uplift_score"] = np.clip(df["churn_probability"] * action_success_lift * (df["estimated_clv"] / df["estimated_clv"].quantile(0.9)), 0, 1)
    df["incremental_revenue_opportunity"] = (df["uplift_score"] * df["estimated_clv"]).round(2)
    top = df.sort_values("incremental_revenue_opportunity", ascending=False).head(20)
    report = {
        "model_type": "two-model-inspired business uplift proxy",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "average_uplift_score": round(float(df["uplift_score"].mean()), 4),
        "total_incremental_revenue_opportunity": round(float(df["incremental_revenue_opportunity"].sum()), 2),
        "top_customers": top[["customer_id", "segment", "recommended_action", "uplift_score", "incremental_revenue_opportunity"]].to_dict(orient="records"),
    }
    _write_json(PLATFORM_DIR / "uplift_report.json", report)
    return report
