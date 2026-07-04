# Enterprise Customer Intelligence Platform

Enterprise Customer Intelligence Platform is a full-stack data science portfolio project for customer analytics, churn reduction, customer lifetime value estimation, segmentation, explainable AI, and next-best-action recommendations.

It is designed as an internal business platform for customer success, marketing strategy, sales prioritization, and revenue protection teams.

## Business Problem

Companies need a reliable way to identify customers likely to churn, understand which accounts create the most long-term value, explain why risk is rising, and choose the retention or growth action most likely to protect revenue.

This project helps answer:

- Which customers are most likely to churn?
- Which accounts represent the most future value?
- How much revenue is currently at risk?
- Why is a customer risky or valuable?
- Which customer segment needs what strategy?
- What action should the company take next?

## Solution Overview

The platform generates a realistic 15,000-customer dataset, trains churn models, estimates CLV, assigns business-readable customer segments, produces SHAP-style explanations, recommends next-best actions, stores outputs in SQLite, exposes them through FastAPI, and visualizes the intelligence in a React dashboard.

## Screenshots
<img width="1720" height="811" alt="Screenshot 2026-07-04 at 15 04 21" src="https://github.com/user-attachments/assets/b77fadbf-6b8c-481c-bfce-af64c0e435a5" />
<img width="1720" height="811" alt="Screenshot 2026-07-04 at 14 59 59" src="https://github.com/user-attachments/assets/0f40dd66-b20f-476b-9d9d-13b179d9a459" />
<img width="1720" height="811" alt="Screenshot 2026-07-04 at 14 59 51" src="https://github.com/user-attachments/assets/46d4ee17-ed10-4062-9a40-46235fe0f245" />
<img width="1720" height="811" alt="Screenshot 2026-07-04 at 14 59 43" src="https://github.com/user-attachments/assets/3b55cf0a-ab03-4101-8462-cb10bd6b1cc8" />
<img width="1720" height="811" alt="Screenshot 2026-07-04 at 14 59 35" src="https://github.com/user-attachments/assets/4974c4b2-0be3-4ff0-83fb-fbc53ae387e4" />
<img width="1720" height="811" alt="Screenshot 2026-07-04 at 14 59 07" src="https://github.com/user-attachments/assets/ca9bd9de-039e-42df-9017-c1e9b0cdb545" />
<img width="1720" height="811" alt="Screenshot 2026-07-04 at 14 59 00" src="https://github.com/user-attachments/assets/1d1d3569-24b8-4cef-a426-de021d379a40" />
<img width="1720" height="811" alt="Screenshot 2026-07-04 at 14 53 37" src="https://github.com/user-attachments/assets/00271723-0aa4-4ef1-acad-7240e685ef6d" />


## Key Features

- Synthetic customer dataset with engagement, revenue, support, payment, renewal, sentiment, and marketing behavior
- Reusable preprocessing pipeline with missing-value handling, encoding, scaling, derived features, and train/test exports
- Logistic Regression baseline and XGBoost main churn model
- Model metrics: accuracy, precision, recall, F1-score, ROC-AUC, and confusion matrix
- CLV model using monthly revenue, tenure, contract type, engagement, satisfaction, products used, and churn probability
- Customer segmentation for loyal, at-risk, new, price-sensitive, support-heavy, growth, and stable customers
- Business-readable churn explanations and feature importance
- Next-best-action recommendation engine with cost, success probability, revenue impact, and expected revenue saved
- FastAPI backend with documented JSON endpoints
- SQLite persistence through SQLAlchemy
- React, TypeScript, and Tailwind dashboard for KPIs, customer intelligence, segmentation, revenue, and model performance
- Docker setup runnable with one command
- CSV and Excel upload with schema validation
- CSV/Excel data upload
- Data validation and schema compatibility checks
- Batch scoring
- CRM synchronization simulation
- Scheduled model retraining
- Data quality alerts
- Exportable scored customer results
- Batch scoring for external customer files
- Scheduled retraining configuration and manual retraining trigger
- CRM integration simulation for account, opportunity, and case syncs
- Model monitoring with drift checks and operational alerts
- MLflow-style experiment/run registry for model metrics and artifact locations
- A/B testing analysis for retention actions
- Uplift modeling report to prioritize customers by incremental revenue opportunity

## Dataset

The generated dataset includes at least 15,000 customers with:

- Demographics and profile data
- Acquisition channel, subscription type, contract type, and payment method
- Monthly revenue and total revenue
- Product usage, login activity, session duration, and feature usage score
- Support tickets, unresolved tickets, late payments, and discounts
- Satisfaction score, NPS, renewal timing, customer success calls, and marketing engagement
- Churn label influenced by realistic behavioral patterns

Generated files:

- `backend/data/customers_raw.csv`
- `backend/data/processed_features.csv`
- `backend/data/train_processed.csv`
- `backend/data/test_processed.csv`
- `backend/data/customer_intelligence.csv`
- `backend/data/segment_summary.csv`

## Machine Learning Approach

The churn pipeline trains:

- Logistic Regression baseline with class balancing
- XGBoost main model with probability output

The main model uses a 0.45 decision threshold to prioritize recall and surface more high-risk customers for retention workflows.

Saved artifacts:

- `backend/artifacts/preprocessor.joblib`
- `backend/artifacts/churn_logistic_regression.joblib`
- `backend/artifacts/churn_xgboost_model.joblib`
- `backend/artifacts/model_metrics.json`
- `backend/artifacts/feature_importance.json`

## CLV Approach

The CLV estimate uses:

```text
customer_lifetime_value = expected_monthly_revenue x expected_remaining_months x retention_probability
```

Where:

- `expected_monthly_revenue` is adjusted for product depth
- `expected_remaining_months` depends on contract type, tenure, engagement, and satisfaction
- `retention_probability = 1 - churn_probability`

The system also calculates revenue at risk and potential revenue saved.

## Segmentation Approach

The platform applies clustering inputs and business rules to assign each customer to one of:

- Loyal High-Value Customers
- At-Risk High-Value Customers
- New Low-Engagement Customers
- Price-Sensitive Customers
- Support-Heavy Customers
- Growth Opportunity Customers
- Low-Value Stable Customers

Each segment includes customer count, average churn probability, average CLV, revenue at risk, satisfaction, and a recommended strategy.

## Explainability

The backend exposes global feature importance and customer-level churn reasons. Customer explanations are business-readable, for example:

> Customer has elevated churn risk mainly because of low satisfaction score, unresolved support tickets, low login activity, and renewal date approaching soon.

## Recommendation Engine

Recommendations consider churn probability, CLV, segment, satisfaction, engagement, support pressure, payment risk, renewal timing, and marketing engagement.

Actions include:

- Assign customer success manager
- Offer personalized discount
- Send re-engagement campaign
- Offer product training
- Prioritize support follow-up
- Offer loyalty reward
- Propose annual plan upgrade
- Send renewal reminder
- Cross-sell relevant product
- No action needed

Expected revenue saved is calculated as:

```text
churn_probability x estimated_clv x expected_success_probability - estimated_action_cost
```

## Enterprise ML Platform Extensions

The platform also includes operational capabilities expected in a mature customer intelligence system:

The Operations module supports CSV/Excel customer data upload, schema validation, data quality checks, batch churn scoring, scheduled model retraining, and simulated CRM synchronization. This makes the platform adaptable to real enterprise customer datasets and production-style workflows.

- **CSV/Excel upload:** `POST /data/upload` validates external customer files against the model schema.
- **Batch scoring:** `POST /batch-score/{upload_id}` scores uploaded files and returns churn, CLV, segment, explanation, and next-best-action outputs.
- **Scheduled retraining:** `GET/POST /retraining/schedule` stores retraining cadence, lookback window, and metric guardrails. `POST /retraining/run` runs the training pipeline on demand.
- **CRM integration:** `POST /integrations/crm/sync` simulates syncing CRM accounts, opportunities, and support cases into the intelligence workflow.
- **Model monitoring:** `GET /monitoring/model` reports population health, high-risk rate, drift scores, and alerts.
- **MLflow:** `GET /mlflow/runs` exposes MLflow-style run metadata, metrics, parameters, and artifact URIs.
- **A/B testing:** `POST /experiments/ab-tests` calculates retention uplift, incremental retained customers, revenue impact, and launch decision.
- **Uplift modeling:** `GET /uplift/model` ranks customers by estimated incremental revenue opportunity from recommended actions.

## Tech Stack

- Python, Pandas, NumPy, scikit-learn, XGBoost, SHAP-compatible explainability structure
- FastAPI, SQLAlchemy, SQLite
- React, TypeScript, Tailwind CSS, Vite, lucide-react
- Docker and Docker Compose

## API Endpoints

- `GET /health`
- `GET /customers`
- `GET /customers/{customer_id}`
- `POST /predict-churn`
- `GET /customers/{customer_id}/churn-explanation`
- `GET /customers/{customer_id}/segment`
- `GET /customers/{customer_id}/clv`
- `GET /customers/{customer_id}/recommend-action`
- `GET /dashboard/metrics`
- `GET /segments`
- `GET /segments/{segment_name}`
- `GET /model/performance`
- `GET /feature-importance`
- `GET /revenue-at-risk`
- `POST /data/upload`
- `POST /batch-score/{upload_id}`
- `GET /retraining/schedule`
- `POST /retraining/schedule`
- `POST /retraining/run`
- `POST /integrations/crm/sync`
- `GET /integrations/crm/syncs`
- `GET /monitoring/model`
- `GET /mlflow/runs`
- `GET /experiments/ab-tests`
- `POST /experiments/ab-tests`
- `GET /uplift/model`

Interactive API docs are available at `http://localhost:8000/docs`.

## Dashboard

Screens included:

- Main dashboard with portfolio KPIs
- Searchable and filterable customer intelligence table
- Customer detail panel with profile, churn, CLV, risk reasons, and recommended action
- Segmentation page
- Revenue intelligence page
- Model performance page
- Data operations page for upload, batch scoring, retraining, and CRM sync
- Experimentation and ML Ops page for monitoring, MLflow runs, A/B testing, and uplift modeling

Screenshot placeholders:

- `docs/screenshots/dashboard.png`
- `docs/screenshots/customer-detail.png`
- `docs/screenshots/model-performance.png`

## Run Locally

### Docker

```bash
docker-compose up --build
```

Then open:

- Frontend: `http://localhost:5173`
- Backend docs: `http://localhost:8000/docs`

### Manual Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m ml.train_churn_model
uvicorn app.main:app --reload
```

### Manual Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```text
enterprise-customer-intelligence/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── database/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── ml/
│   │   ├── generate_data.py
│   │   ├── preprocess.py
│   │   ├── train_churn_model.py
│   │   ├── clv_model.py
│   │   ├── segmentation.py
│   │   ├── explainability.py
│   │   └── recommendation_engine.py
│   ├── data/
│   ├── artifacts/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Example Business Insights

- High-value monthly-contract customers with low satisfaction and approaching renewals represent the largest revenue-protection opportunity.
- Support-heavy customers need operational follow-up before commercial retention offers.
- Growth opportunity customers show healthy engagement but limited product depth, making cross-sell motion attractive.
- Low-touch stable customers can remain in automated nurture while teams focus on critical and high-priority accounts.

## Future Improvements

- Add authentication and role-based access
- Move SQLite to PostgreSQL
- Add batch scoring and scheduled retraining
- Add real SHAP value persistence for every customer
- Add CRM and customer support system integrations
- Add A/B testing for recommendation effectiveness

## Interview Pitch

Built an enterprise customer intelligence platform that combines customer segmentation, churn prediction, customer lifetime value estimation, explainable AI, and next-best-action recommendations to help businesses reduce churn, prioritize high-value customers, and improve retention through a full-stack dashboard and FastAPI backend.
