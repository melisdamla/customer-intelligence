from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.database import SessionLocal
from app.services.bootstrap import ensure_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        ensure_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Enterprise Customer Intelligence Platform API",
    description="Customer churn, CLV, segmentation, explainability, and next-best-action intelligence.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
