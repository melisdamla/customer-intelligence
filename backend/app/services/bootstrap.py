from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import Base, engine
from app.models.customer import CustomerIntelligence

BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_DIR / "data"
ARTIFACTS_DIR = BACKEND_DIR / "artifacts"
CUSTOMER_INTELLIGENCE_CSV = DATA_DIR / "customer_intelligence.csv"


def ensure_database(db: Session) -> None:
    Base.metadata.create_all(bind=engine)
    row_count = db.query(func.count(CustomerIntelligence.customer_id)).scalar()
    if row_count:
        return
    if not CUSTOMER_INTELLIGENCE_CSV.exists():
        from ml.train_churn_model import run_pipeline

        run_pipeline()

    df = pd.read_csv(CUSTOMER_INTELLIGENCE_CSV)
    rows = df.replace({pd.NA: None}).to_dict(orient="records")
    db.bulk_insert_mappings(CustomerIntelligence, rows)
    db.commit()


def load_json_artifact(name: str, default):
    path = ARTIFACTS_DIR / name
    if not path.exists():
        return default
    return json.loads(path.read_text())
