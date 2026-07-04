from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import CustomerIntelligence
from app.services.intelligence import (
    as_dict,
    dashboard_metrics,
    explain_customer,
    feature_importance,
    model_performance,
    revenue_at_risk,
    segment_summary,
)
from app.services.platform import (
    ab_test_history,
    analyze_ab_test,
    configure_retraining,
    crm_history,
    crm_sync,
    mlflow_runs,
    monitoring_report,
    operations_crm_status,
    operations_data_quality_alerts,
    operations_retraining_status,
    operations_schema,
    operations_scoring_preview,
    operations_validation_summary,
    retraining_status,
    run_retraining_job,
    save_upload,
    score_uploaded_batch,
    uplift_model_report,
)

router = APIRouter()


def get_customer_or_404(customer_id: str, db: Session) -> CustomerIntelligence:
    customer = db.get(CustomerIntelligence, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
    return customer


@router.get("/health")
def health() -> dict:
    return {"status": "healthy", "service": "enterprise-customer-intelligence"}


@router.get("/customers")
def customers(
    db: Session = Depends(get_db),
    search: str | None = None,
    segment: str | None = None,
    priority_level: str | None = None,
    subscription_type: str | None = None,
    region: str | None = None,
    risk_level: str | None = None,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> dict:
    query = db.query(CustomerIntelligence)
    if search:
        query = query.filter(CustomerIntelligence.customer_id.contains(search))
    if segment:
        query = query.filter(CustomerIntelligence.segment == segment)
    if priority_level:
        query = query.filter(CustomerIntelligence.priority_level == priority_level)
    if subscription_type:
        query = query.filter(CustomerIntelligence.subscription_type == subscription_type)
    if region:
        query = query.filter(CustomerIntelligence.region == region)
    if risk_level == "Critical":
        query = query.filter(CustomerIntelligence.churn_probability >= 0.75)
    elif risk_level == "High":
        query = query.filter(CustomerIntelligence.churn_probability >= 0.55, CustomerIntelligence.churn_probability < 0.75)
    elif risk_level == "Medium":
        query = query.filter(CustomerIntelligence.churn_probability >= 0.35, CustomerIntelligence.churn_probability < 0.55)
    elif risk_level == "Low":
        query = query.filter(CustomerIntelligence.churn_probability < 0.35)

    total = query.count()
    rows = query.order_by(CustomerIntelligence.revenue_at_risk.desc()).offset(offset).limit(limit).all()
    return {"total": total, "customers": [as_dict(row) for row in rows]}


@router.get("/customers/{customer_id}")
def customer(customer_id: str, db: Session = Depends(get_db)) -> dict:
    return as_dict(get_customer_or_404(customer_id, db))


@router.post("/predict-churn")
def predict_churn(payload: dict, db: Session = Depends(get_db)) -> dict:
    customer_id = payload.get("customer_id")
    if customer_id:
        customer = get_customer_or_404(customer_id, db)
        return {
            "customer_id": customer.customer_id,
            "churn_probability": customer.churn_probability,
            "predicted_churn": int(customer.churn_probability >= 0.5),
            "top_reasons": customer.top_churn_reasons.split(";"),
        }
    raise HTTPException(status_code=400, detail="Pass an existing customer_id for portfolio demo predictions")


@router.get("/customers/{customer_id}/churn-explanation")
def churn_explanation(customer_id: str, db: Session = Depends(get_db)) -> dict:
    return explain_customer(get_customer_or_404(customer_id, db))


@router.get("/customers/{customer_id}/segment")
def customer_segment(customer_id: str, db: Session = Depends(get_db)) -> dict:
    customer = get_customer_or_404(customer_id, db)
    return {"customer_id": customer_id, "segment": customer.segment, "strategy": customer.segment_strategy}


@router.get("/customers/{customer_id}/clv")
def customer_clv(customer_id: str, db: Session = Depends(get_db)) -> dict:
    customer = get_customer_or_404(customer_id, db)
    return {
        "customer_id": customer_id,
        "current_monthly_revenue": customer.monthly_revenue,
        "estimated_clv": customer.estimated_clv,
        "revenue_at_risk": customer.revenue_at_risk,
        "potential_revenue_saved": customer.potential_revenue_saved,
    }


@router.get("/customers/{customer_id}/recommend-action")
def recommend_action(customer_id: str, db: Session = Depends(get_db)) -> dict:
    customer = get_customer_or_404(customer_id, db)
    return {
        "customer_id": customer_id,
        "recommended_action": customer.recommended_action,
        "explanation": customer.recommendation_explanation,
        "priority_level": customer.priority_level,
        "estimated_action_cost": customer.estimated_action_cost,
        "expected_success_probability": customer.expected_success_probability,
        "expected_revenue_impact": customer.expected_revenue_impact,
        "expected_revenue_saved": customer.expected_revenue_saved,
    }


@router.get("/dashboard/metrics")
def metrics(db: Session = Depends(get_db)) -> dict:
    return dashboard_metrics(db)


@router.get("/segments")
def segments(db: Session = Depends(get_db)) -> list[dict]:
    return segment_summary(db)


@router.get("/segments/{segment_name}")
def segment(segment_name: str, db: Session = Depends(get_db)) -> dict:
    summary = [row for row in segment_summary(db) if row["segment"] == segment_name]
    if not summary:
        raise HTTPException(status_code=404, detail=f"Segment {segment_name} not found")
    rows = db.query(CustomerIntelligence).filter(CustomerIntelligence.segment == segment_name).limit(50).all()
    return {**summary[0], "sample_customers": [as_dict(row) for row in rows]}


@router.get("/model/performance")
def performance() -> dict:
    return model_performance()


@router.get("/feature-importance")
def importance() -> list[dict]:
    return feature_importance()


@router.get("/revenue-at-risk")
def risk(db: Session = Depends(get_db)) -> dict:
    return revenue_at_risk(db)


@router.post("/data/upload")
def upload_customer_data(file: UploadFile = File(...)) -> dict:
    return save_upload(file)


@router.post("/batch-score/{upload_id}")
def batch_score(upload_id: str) -> dict:
    return score_uploaded_batch(upload_id)


@router.get("/retraining/schedule")
def get_retraining_schedule() -> dict:
    return retraining_status()


@router.post("/retraining/schedule")
def set_retraining_schedule(payload: dict) -> dict:
    return configure_retraining(
        cadence=payload.get("cadence", "weekly"),
        lookback_days=int(payload.get("lookback_days", 90)),
        metric_guardrail=float(payload.get("metric_guardrail_roc_auc", 0.78)),
    )


@router.post("/retraining/run")
def run_retraining() -> dict:
    return run_retraining_job()


@router.post("/integrations/crm/sync")
def sync_crm(payload: dict) -> dict:
    return crm_sync(payload)


@router.get("/integrations/crm/syncs")
def crm_syncs() -> list[dict]:
    return crm_history()


@router.get("/monitoring/model")
def model_monitoring() -> dict:
    return monitoring_report()


@router.get("/mlflow/runs")
def get_mlflow_runs() -> list[dict]:
    return mlflow_runs()


@router.post("/experiments/ab-tests")
def create_ab_test(payload: dict) -> dict:
    return analyze_ab_test(payload)


@router.get("/experiments/ab-tests")
def get_ab_tests() -> list[dict]:
    return ab_test_history()


@router.get("/uplift/model")
def uplift_model() -> dict:
    return uplift_model_report()


@router.post("/operations/upload")
def operations_upload(file: UploadFile = File(...)) -> dict:
    return save_upload(file)


@router.post("/operations/validate")
def operations_validate(payload: dict | None = None) -> dict:
    upload_id = payload.get("upload_id") if payload else None
    return operations_validation_summary(upload_id)


@router.post("/operations/batch-score")
def operations_batch_score(payload: dict | None = None) -> dict:
    upload_id = payload.get("upload_id") if payload else None
    if upload_id:
        return score_uploaded_batch(upload_id)
    preview = operations_scoring_preview()
    return {
        "batch_id": "simulated-batch-preview",
        "rows_scored": 15_000,
        "high_risk_customers": 1558,
        "revenue_at_risk": 6_981_999.23,
        "expected_revenue_saved": 1_167_105.37,
        "preview": preview["rows"],
    }


@router.get("/operations/schema")
def get_operations_schema() -> dict:
    return operations_schema()


@router.get("/operations/validation-summary")
def get_operations_validation_summary() -> dict:
    return operations_validation_summary()


@router.get("/operations/scoring-preview")
def get_operations_scoring_preview() -> dict:
    return operations_scoring_preview()


@router.post("/operations/crm-sync")
def operations_crm_sync(payload: dict | None = None) -> dict:
    return crm_sync(payload or {"provider": "Salesforce", "account_count": 1500})


@router.get("/operations/crm-sync/status")
def get_operations_crm_sync_status() -> dict:
    return operations_crm_status()


@router.post("/operations/retrain")
def operations_retrain() -> dict:
    return run_retraining_job()


@router.get("/operations/retraining/status")
def get_operations_retraining_status() -> dict:
    return operations_retraining_status()


@router.get("/operations/data-quality-alerts")
def get_operations_data_quality_alerts() -> list[dict]:
    return operations_data_quality_alerts()
