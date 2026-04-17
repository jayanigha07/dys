"""FastAPI main application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routes import assessment, predict, report

app = FastAPI(
    title="DysLexia Screening API",
    description="Early dyslexia risk screening tool for children aged 5–7. NOT a medical diagnosis system.",
    version="1.0.0",
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(assessment.router)
app.include_router(predict.router)
app.include_router(report.router)


@app.on_event("startup")
def startup():
    init_db()
    print("[OK] Database initialized")


@app.get("/")
def root():
    return {
        "message": "DysLexia Screening API is running.",
        "disclaimer": "This is a screening tool, NOT a medical diagnosis system.",
        "docs": "/docs",
    }
