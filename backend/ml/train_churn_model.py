from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from ml.clv_model import calculate_clv
from ml.explainability import business_reasons
from ml.generate_data import generate_customer_data
from ml.preprocess import TARGET, add_derived_features, build_preprocessor
from ml.recommendation_engine import recommend_actions
from ml.segmentation import segment_customers, summarize_segments

try:
    from xgboost import XGBClassifier
except Exception:  # pragma: no cover
    from sklearn.ensemble import HistGradientBoostingClassifier as XGBClassifier

BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
ARTIFACTS_DIR = BACKEND_DIR / "artifacts"


def _metrics(model: Pipeline, x_test: pd.DataFrame, y_test: pd.Series, threshold: float = 0.45) -> dict:
    probabilities = model.predict_proba(x_test)[:, 1]
    predictions = (probabilities >= threshold).astype(int)
    return {
        "accuracy": round(accuracy_score(y_test, predictions), 4),
        "precision": round(precision_score(y_test, predictions), 4),
        "recall": round(recall_score(y_test, predictions), 4),
        "f1_score": round(f1_score(y_test, predictions), 4),
        "roc_auc": round(roc_auc_score(y_test, probabilities), 4),
        "confusion_matrix": confusion_matrix(y_test, predictions).tolist(),
        "threshold": threshold,
    }


def _feature_importance(model: Pipeline) -> list[dict]:
    preprocessor = model.named_steps["preprocessor"]
    classifier = model.named_steps["classifier"]
    feature_names = preprocessor.get_feature_names_out()
    if hasattr(classifier, "feature_importances_"):
        importances = classifier.feature_importances_
    else:
        importances = abs(classifier.coef_[0])
    rows = sorted(zip(feature_names, importances), key=lambda item: item[1], reverse=True)[:20]
    return [{"feature": name.replace("num__", "").replace("cat__", ""), "importance": round(float(value), 5)} for name, value in rows]


def run_pipeline(n_customers: int = 15_000) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    raw = generate_customer_data(n_customers=n_customers)
    raw.to_csv(DATA_DIR / "customers_raw.csv", index=False)
    enriched = add_derived_features(raw)
    enriched.to_csv(DATA_DIR / "processed_features.csv", index=False)

    x = enriched.drop(columns=[TARGET, "customer_id"])
    y = enriched[TARGET]
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.22, random_state=42, stratify=y)
    pd.concat([x_train, y_train], axis=1).to_csv(DATA_DIR / "train_processed.csv", index=False)
    pd.concat([x_test, y_test], axis=1).to_csv(DATA_DIR / "test_processed.csv", index=False)

    preprocessor, _, _ = build_preprocessor(enriched)
    logistic_model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=1200, class_weight="balanced", n_jobs=1)),
        ]
    )
    logistic_model.fit(x_train, y_train)

    positive_count = int(y_train.sum())
    negative_count = int(len(y_train) - positive_count)
    xgb_classifier = XGBClassifier(
        n_estimators=240,
        max_depth=4,
        learning_rate=0.045,
        subsample=0.88,
        colsample_bytree=0.82,
        scale_pos_weight=max(1, negative_count / max(positive_count, 1)),
        eval_metric="logloss",
        random_state=42,
    )
    main_model = Pipeline(steps=[("preprocessor", build_preprocessor(enriched)[0]), ("classifier", xgb_classifier)])
    main_model.fit(x_train, y_train)

    metrics = {
        "baseline_logistic_regression": _metrics(logistic_model, x_test, y_test, threshold=0.45),
        "main_xgboost_model": _metrics(main_model, x_test, y_test, threshold=0.25),
        "decision_threshold": 0.25,
        "modeling_note": "Recall is prioritized to surface more high-risk customers for retention action.",
    }
    (ARTIFACTS_DIR / "model_metrics.json").write_text(json.dumps(metrics, indent=2))
    feature_importance = _feature_importance(main_model)
    (ARTIFACTS_DIR / "feature_importance.json").write_text(json.dumps(feature_importance, indent=2))
    joblib.dump(logistic_model, ARTIFACTS_DIR / "churn_logistic_regression.joblib")
    joblib.dump(main_model, ARTIFACTS_DIR / "churn_xgboost_model.joblib")
    joblib.dump(main_model.named_steps["preprocessor"], ARTIFACTS_DIR / "preprocessor.joblib")

    scored = enriched.copy()
    scored["churn_probability"] = main_model.predict_proba(x)[:, 1].round(4)
    scored = calculate_clv(scored)
    scored = segment_customers(scored)
    scored["top_churn_reasons"] = scored.apply(business_reasons, axis=1)
    scored = recommend_actions(scored)
    scored.to_csv(DATA_DIR / "customer_intelligence.csv", index=False)
    summarize_segments(scored).to_csv(DATA_DIR / "segment_summary.csv", index=False)
    baseline_columns = ["monthly_revenue", "engagement_score", "support_pressure_score", "satisfaction_score", "churn_probability"]
    baseline_stats = {
        column: {"mean": round(float(scored[column].mean()), 6), "std": round(float(scored[column].std()), 6)}
        for column in baseline_columns
    }
    (ARTIFACTS_DIR / "baseline_stats.json").write_text(json.dumps(baseline_stats, indent=2))
    print("Pipeline complete")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    run_pipeline()
