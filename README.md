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

Interactive API docs are available at `http://localhost:8000/docs`.

## Dashboard

Screens included:

- Main dashboard with portfolio KPIs
- Searchable and filterable customer intelligence table
- Customer detail panel with profile, churn, CLV, risk reasons, and recommended action
- Segmentation page
- Revenue intelligence page
- Model performance page

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
