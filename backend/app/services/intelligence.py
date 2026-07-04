from __future__ import annotations

from collections import Counter

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.customer import CustomerIntelligence
from app.services.bootstrap import load_json_artifact


def risk_level(probability: float) -> str:
    if probability >= 0.75:
        return "Critical"
    if probability >= 0.55:
        return "High"
    if probability >= 0.35:
        return "Medium"
    return "Low"


def as_dict(customer: CustomerIntelligence) -> dict:
    return {column.name: getattr(customer, column.name) for column in customer.__table__.columns}


def dashboard_metrics(db: Session) -> dict:
    total = db.query(func.count(CustomerIntelligence.customer_id)).scalar() or 0
    agg = db.query(
        func.avg(CustomerIntelligence.churn_probability),
        func.sum(CustomerIntelligence.monthly_revenue),
        func.sum(CustomerIntelligence.estimated_clv),
        func.sum(CustomerIntelligence.revenue_at_risk),
        func.sum(CustomerIntelligence.expected_revenue_saved),
        func.avg(CustomerIntelligence.satisfaction_score),
        func.avg(CustomerIntelligence.nps_score),
    ).one()
    high_risk = db.query(func.count(CustomerIntelligence.customer_id)).filter(CustomerIntelligence.churn_probability >= 0.55).scalar()
    return {
        "total_customers": total,
        "predicted_churn_rate": round((agg[0] or 0) * 100, 2),
        "high_risk_customers": high_risk or 0,
        "total_monthly_recurring_revenue": round(agg[1] or 0, 2),
        "total_estimated_clv": round(agg[2] or 0, 2),
        "revenue_at_risk": round(agg[3] or 0, 2),
        "expected_revenue_saved": round(agg[4] or 0, 2),
        "average_satisfaction_score": round(agg[5] or 0, 2),
        "average_nps_score": round(agg[6] or 0, 2),
    }


def segment_summary(db: Session) -> list[dict]:
    rows = db.query(
        CustomerIntelligence.segment,
        func.count(CustomerIntelligence.customer_id),
        func.avg(CustomerIntelligence.churn_probability),
        func.avg(CustomerIntelligence.estimated_clv),
        func.sum(CustomerIntelligence.revenue_at_risk),
        func.avg(CustomerIntelligence.satisfaction_score),
        func.max(CustomerIntelligence.segment_strategy),
    ).group_by(CustomerIntelligence.segment).all()
    return [
        {
            "segment": row[0],
            "customer_count": row[1],
            "average_churn_probability": round(row[2], 4),
            "average_clv": round(row[3], 2),
            "revenue_at_risk": round(row[4], 2),
            "average_satisfaction_score": round(row[5], 2),
            "recommended_business_strategy": row[6],
        }
        for row in rows
    ]


def model_performance() -> dict:
    return load_json_artifact("model_metrics.json", {})


def feature_importance() -> list[dict]:
    return load_json_artifact("feature_importance.json", [])


def explain_customer(customer: CustomerIntelligence) -> dict:
    reasons = [reason.strip() for reason in customer.top_churn_reasons.split(";") if reason.strip()]
    sentence = "Customer has elevated churn risk mainly because of " + ", ".join(reasons[:4]).lower() + "."
    if customer.churn_probability < 0.35:
        sentence = "Customer currently shows stable retention signals, led by " + ", ".join(reasons[:4]).lower() + "."
    return {
        "customer_id": customer.customer_id,
        "churn_probability": customer.churn_probability,
        "risk_level": risk_level(customer.churn_probability),
        "top_reasons": reasons,
        "business_explanation": sentence,
    }


def revenue_at_risk(db: Session) -> dict:
    by_priority = db.query(
        CustomerIntelligence.priority_level,
        func.sum(CustomerIntelligence.revenue_at_risk),
        func.count(CustomerIntelligence.customer_id),
    ).group_by(CustomerIntelligence.priority_level).all()
    top_accounts = db.query(CustomerIntelligence).order_by(CustomerIntelligence.revenue_at_risk.desc()).limit(10).all()
    return {
        "total_revenue_at_risk": dashboard_metrics(db)["revenue_at_risk"],
        "by_priority": [{"priority_level": p, "revenue_at_risk": round(v or 0, 2), "customers": c} for p, v, c in by_priority],
        "top_accounts": [
            {
                "customer_id": c.customer_id,
                "segment": c.segment,
                "churn_probability": c.churn_probability,
                "estimated_clv": c.estimated_clv,
                "revenue_at_risk": c.revenue_at_risk,
                "recommended_action": c.recommended_action,
            }
            for c in top_accounts
        ],
    }
