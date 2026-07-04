from pydantic import BaseModel, ConfigDict


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    customer_id: str
    segment: str
    churn_probability: float
    estimated_clv: float
    revenue_at_risk: float
    satisfaction_score: float
    nps_score: int
    recommended_action: str
    priority_level: str


class CustomerSearchResponse(BaseModel):
    total: int
    customers: list[CustomerResponse]
