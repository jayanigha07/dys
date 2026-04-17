"""
ML prediction endpoint API.
"""

import os
import json
import joblib
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from database import get_db, Prediction
from schemas import PredictRequest, PredictResponse, ModelStatsResponse

router = APIRouter(prefix="/api", tags=["prediction"])

# Load model artifacts at startup
_BASE = os.path.join(os.path.dirname(__file__), "..", "models")
_model  = joblib.load(os.path.join(_BASE, "model.pkl"))
_scaler = joblib.load(os.path.join(_BASE, "scaler.pkl"))

with open(os.path.join(_BASE, "model_stats.json")) as f:
    _stats = json.load(f)

FEATURES = [
    "accuracy_score", "avg_response_time", "error_rate",
    "confusion_score", "retry_count", "memory_score", "reading_time",
]

RECOMMENDATIONS = {
    "phonetics": [
        "Practice phonics exercises daily (letter-sound matching).",
        "Use audiobooks alongside printed books to strengthen sound associations.",
        "Try syllable-clapping games to improve phonemic awareness.",
    ],
    "memory": [
        "Play memory card matching games regularly.",
        "Break tasks into small, manageable steps.",
        "Use visual cues and color coding to aid recall.",
    ],
    "visual": [
        "Practice letter tracing exercises (b vs d, p vs q).",
        "Use larger font sizes and increased line spacing.",
        "Colored overlays can reduce visual stress during reading.",
    ],
    "speed": [
        "Allow extra time for reading tasks — never rush.",
        "Read together aloud to build reading fluency gradually.",
        "Short, frequent reading sessions are more effective than long ones.",
    ],
}


def _get_recommendations(features: dict, risk_label: int) -> tuple[list, list]:
    """Return personalized recommendations and weak areas based on feature values."""
    recs = []
    weak = []

    if risk_label == 0:
        return ["Keep up the great work! Continue with regular reading practice."], []

    if features["confusion_score"] > 0.4:
        weak.append("Visual Letter Confusion")
        recs += RECOMMENDATIONS["visual"][:2]

    if features["memory_score"] < 0.5:
        weak.append("Working Memory")
        recs += RECOMMENDATIONS["memory"][:2]

    if features["accuracy_score"] < 0.6:
        weak.append("Phonetic Accuracy")
        recs += RECOMMENDATIONS["phonetics"][:2]

    if features["reading_time"] > 5.0 or features["avg_response_time"] > 4.0:
        weak.append("Reading Fluency & Speed")
        recs += RECOMMENDATIONS["speed"][:2]

    if not recs:
        recs = ["Encourage regular reading. Consult a specialist for further evaluation."]

    return recs[:5], weak


@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest, db: DBSession = Depends(get_db)):
    feat_values = [
        payload.accuracy_score, payload.avg_response_time, payload.error_rate,
        payload.confusion_score, payload.retry_count, payload.memory_score,
        payload.reading_time,
    ]
    X = np.array([feat_values])
    X_sc = _scaler.transform(X)

    risk_label = int(_model.predict(X_sc)[0])
    proba      = _model.predict_proba(X_sc)[0]

    prob_no_risk = round(float(proba[0]), 4)
    prob_risk    = round(float(proba[1]), 4)

    # Map to human-readable risk level
    if risk_label == 0:
        risk_level = "Low"
    elif prob_risk < 0.70:
        risk_level = "Medium"
    else:
        risk_level = "High"

    feat_dict = dict(zip(FEATURES, feat_values))
    recs, weak = _get_recommendations(feat_dict, risk_label)

    feat_imp = _stats["feature_importances"]

    # Persist to DB
    pred_row = Prediction(
        session_id=payload.session_id,
        risk_level=risk_level,
        risk_label=risk_label,
        probability_no_risk=prob_no_risk,
        probability_risk=prob_risk,
        accuracy_score=payload.accuracy_score,
        avg_response_time=payload.avg_response_time,
        error_rate=payload.error_rate,
        confusion_score=payload.confusion_score,
        retry_count=int(payload.retry_count),
        memory_score=payload.memory_score,
        reading_time=payload.reading_time,
        recommendations=recs,
    )
    db.add(pred_row)
    db.commit()

    return PredictResponse(
        session_id=payload.session_id,
        risk_label=risk_label,
        risk_level=risk_level,
        probability_no_risk=prob_no_risk,
        probability_risk=prob_risk,
        feature_importances=feat_imp,
        recommendations=recs,
        weak_areas=weak,
    )


@router.get("/model-stats", response_model=ModelStatsResponse)
def model_stats():
    return ModelStatsResponse(**_stats)


@router.get("/prediction/{session_id}")
def get_prediction(session_id: int, db: DBSession = Depends(get_db)):
    pred = db.query(Prediction).filter(
        Prediction.session_id == session_id
    ).order_by(Prediction.id.desc()).first()
    if not pred:
        raise HTTPException(status_code=404, detail="No prediction found for session")
    feat_imp = _stats["feature_importances"]
    feat_dict = {
        "accuracy_score": pred.accuracy_score,
        "avg_response_time": pred.avg_response_time,
        "error_rate": pred.error_rate,
        "confusion_score": pred.confusion_score,
        "retry_count": pred.retry_count,
        "memory_score": pred.memory_score,
        "reading_time": pred.reading_time,
    }
    _, weak = _get_recommendations(feat_dict, pred.risk_label)
    return {
        "session_id": session_id,
        "risk_label": pred.risk_label,
        "risk_level": pred.risk_level,
        "probability_no_risk": pred.probability_no_risk,
        "probability_risk": pred.probability_risk,
        "feature_importances": feat_imp,
        "recommendations": pred.recommendations or [],
        "weak_areas": weak,
        "features": feat_dict,
    }
