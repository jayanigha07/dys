"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import datetime


# ── Session ──────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    child_name: Optional[str] = "Anonymous"
    child_age: Optional[int] = 6


class SessionResponse(BaseModel):
    id: int
    child_name: Optional[str]
    child_age: Optional[int]
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ── Game Results ──────────────────────────────────────────────────────────────

class GameResultCreate(BaseModel):
    session_id: int
    game_name: str
    accuracy_score: float = 0.0
    avg_response_time: float = 0.0
    error_rate: float = 0.0
    confusion_score: float = 0.0
    retry_count: int = 0
    memory_score: float = 0.0
    reading_time: float = 0.0
    raw_data: Optional[Dict[str, Any]] = None


class GameResultResponse(BaseModel):
    id: int
    session_id: int
    game_name: str
    accuracy_score: float
    avg_response_time: float
    error_rate: float
    confusion_score: float
    retry_count: int
    memory_score: float
    reading_time: float
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ── Prediction ────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    session_id: int
    accuracy_score: float
    avg_response_time: float
    error_rate: float
    confusion_score: float
    retry_count: float
    memory_score: float
    reading_time: float


class PredictResponse(BaseModel):
    session_id: int
    risk_label: int
    risk_level: str
    probability_no_risk: float
    probability_risk: float
    feature_importances: Dict[str, float]
    recommendations: List[str]
    weak_areas: List[str]


# ── Model Stats ───────────────────────────────────────────────────────────────

class ModelStatsResponse(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: List[List[int]]
    feature_importances: Dict[str, float]
    cross_val_mean: float
    cross_val_std: float
