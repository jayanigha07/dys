# -*- coding: utf-8 -*-
"""
ML Training Pipeline for Dyslexia Risk Screening
=================================================
Generates a synthetic dataset of 1500 samples,
trains a RandomForestClassifier with GridSearchCV,
evaluates performance, and saves model + scaler artifacts.

NOTE: Model intentionally has realistic accuracy (~85-92%) with noise
to reflect real-world performance — not an overfit 100% model.
"""

import os
import json
import numpy as np
import pandas as pd
import joblib
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report
)

SEED = 42
np.random.seed(SEED)

FEATURES = [
    "accuracy_score",
    "avg_response_time",
    "error_rate",
    "confusion_score",
    "retry_count",
    "memory_score",
    "reading_time",
]

OUTPUT_DIR = os.path.dirname(__file__)


# ── 1. Dataset Generation ─────────────────────────────────────────────────────

def generate_dataset(n_samples: int = 1500) -> pd.DataFrame:
    """
    Generate a realistic synthetic dataset with significant class overlap.
    Class 0 (No Risk) and Class 1 (At Risk) each ~750 samples.
    Feature distributions are grounded in published dyslexia research ranges.
    Substantial overlap ensures model accuracy is realistic (~85-91%).
    """
    n_per_class = n_samples // 2

    # ── No-Risk children (Class 0) ── wider std dev = more overlap
    no_risk = pd.DataFrame({
        "accuracy_score":    np.clip(np.random.normal(0.78, 0.12, n_per_class), 0.40, 1.0),
        "avg_response_time": np.clip(np.random.normal(2.4,  0.8,  n_per_class), 0.8,  7.0),
        "error_rate":        np.clip(np.random.normal(0.16, 0.09, n_per_class), 0.0,  0.55),
        "confusion_score":   np.clip(np.random.normal(0.20, 0.12, n_per_class), 0.0,  0.70),
        "retry_count":       np.clip(np.random.poisson(2.0, n_per_class),       0,    10).astype(float),
        "memory_score":      np.clip(np.random.normal(0.72, 0.14, n_per_class), 0.3,  1.0),
        "reading_time":      np.clip(np.random.normal(3.5,  1.1,  n_per_class), 1.0,  9.0),
        "risk_label": 0,
    })

    # ── At-Risk children (Class 1) ── wider std dev = more overlap
    at_risk = pd.DataFrame({
        "accuracy_score":    np.clip(np.random.normal(0.54, 0.14, n_per_class), 0.10,  0.82),
        "avg_response_time": np.clip(np.random.normal(3.9,  1.1,  n_per_class), 1.0,   9.0),
        "error_rate":        np.clip(np.random.normal(0.38, 0.12, n_per_class), 0.10,  0.90),
        "confusion_score":   np.clip(np.random.normal(0.52, 0.15, n_per_class), 0.10,  0.95),
        "retry_count":       np.clip(np.random.poisson(4.0, n_per_class),       1,     15).astype(float),
        "memory_score":      np.clip(np.random.normal(0.45, 0.15, n_per_class), 0.10,  0.78),
        "reading_time":      np.clip(np.random.normal(6.2,  1.5,  n_per_class), 2.0,   12.0),
        "risk_label": 1,
    })

    # Add realistic noise on boundary samples (makes classification harder)
    # ~20% of samples in each class will be "ambiguous"
    noise_idx_0 = np.random.choice(n_per_class, size=int(n_per_class * 0.20), replace=False)
    noisy_0 = no_risk.iloc[noise_idx_0].copy()
    noisy_0["accuracy_score"]    -= np.random.uniform(0.08, 0.20, len(noisy_0))
    noisy_0["error_rate"]        += np.random.uniform(0.08, 0.18, len(noisy_0))
    noisy_0["confusion_score"]   += np.random.uniform(0.05, 0.15, len(noisy_0))
    noisy_0["memory_score"]      -= np.random.uniform(0.05, 0.15, len(noisy_0))
    no_risk.iloc[noise_idx_0] = noisy_0

    noise_idx_1 = np.random.choice(n_per_class, size=int(n_per_class * 0.20), replace=False)
    noisy_1 = at_risk.iloc[noise_idx_1].copy()
    noisy_1["accuracy_score"]    += np.random.uniform(0.08, 0.18, len(noisy_1))
    noisy_1["error_rate"]        -= np.random.uniform(0.06, 0.14, len(noisy_1))
    noisy_1["confusion_score"]   -= np.random.uniform(0.06, 0.14, len(noisy_1))
    noisy_1["memory_score"]      += np.random.uniform(0.06, 0.14, len(noisy_1))
    at_risk.iloc[noise_idx_1] = noisy_1

    # Clip all columns back to valid ranges
    feature_cols = [c for c in no_risk.columns if c != 'risk_label']
    for df in [no_risk, at_risk]:
        for col in feature_cols:
            df[col] = df[col].clip(0, 1 if col not in ['avg_response_time', 'reading_time', 'retry_count'] else 15)

    df = pd.concat([no_risk, at_risk], ignore_index=True).sample(frac=1, random_state=SEED)
    df = df.round(4)
    return df


# ── 2. Training ───────────────────────────────────────────────────────────────

def train(df: pd.DataFrame):
    X = df[FEATURES]
    y = df["risk_label"]

    # 80 / 20 stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y
    )

    # Feature scaling
    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_test_sc  = scaler.transform(X_test)

    # Constrained hyperparameter grid — shallower trees limit overfitting
    param_grid = {
        "n_estimators": [50, 100, 150],
        "max_depth":    [3, 4, 5],
        "min_samples_split": [8, 15, 25],
        "min_samples_leaf":  [4, 8, 12],
        "max_features":      ["sqrt", 0.5],
    }

    base_rf = RandomForestClassifier(random_state=SEED, class_weight="balanced", n_jobs=-1)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    grid_search = GridSearchCV(
        base_rf, param_grid, cv=cv,
        scoring="f1", n_jobs=-1, verbose=1
    )
    grid_search.fit(X_train_sc, y_train)

    best_model = grid_search.best_estimator_
    print(f"\nBest params: {grid_search.best_params_}")

    # Evaluation
    y_pred = best_model.predict(X_test_sc)
    y_prob = best_model.predict_proba(X_test_sc)

    acc  = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec  = recall_score(y_test, y_pred, zero_division=0)
    f1   = f1_score(y_test, y_pred, zero_division=0)
    cm   = confusion_matrix(y_test, y_pred).tolist()

    cv_scores = cross_val_score(best_model, X_train_sc, y_train, cv=cv, scoring="f1")

    feat_imp = dict(zip(FEATURES, best_model.feature_importances_.tolist()))

    print(f"\nTest Accuracy : {acc:.4f}")
    print(f"   Precision   : {prec:.4f}")
    print(f"   Recall      : {rec:.4f}")
    print(f"   F1-Score    : {f1:.4f}")
    print(f"   CV F1 Mean  : {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")
    print(f"\nConfusion Matrix:\n{np.array(cm)}")
    print(f"\n{classification_report(y_test, y_pred, target_names=['No Risk','At Risk'])}")

    # Save artifacts
    joblib.dump(best_model, os.path.join(OUTPUT_DIR, "model.pkl"))
    joblib.dump(scaler,    os.path.join(OUTPUT_DIR, "scaler.pkl"))

    stats = {
        "accuracy":           round(acc,  4),
        "precision":          round(prec, 4),
        "recall":             round(rec,  4),
        "f1_score":           round(f1,   4),
        "confusion_matrix":   cm,
        "feature_importances": {k: round(v, 4) for k, v in feat_imp.items()},
        "cross_val_mean":     round(float(cv_scores.mean()), 4),
        "cross_val_std":      round(float(cv_scores.std()),  4),
        "best_params":        grid_search.best_params_,
    }

    with open(os.path.join(OUTPUT_DIR, "model_stats.json"), "w") as f:
        json.dump(stats, f, indent=2)

    print("\nSaved: model.pkl, scaler.pkl, model_stats.json")
    return stats


# ── 3. Entry Point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Generating dataset (1500 samples)...")
    df = generate_dataset(1500)
    print(f"Class distribution:\n{df['risk_label'].value_counts()}")
    df.to_csv(os.path.join(OUTPUT_DIR, "dataset.csv"), index=False)
    print("dataset.csv saved.")

    print("\nTraining Random Forest (GridSearchCV 5-fold CV)...")
    train(df)
