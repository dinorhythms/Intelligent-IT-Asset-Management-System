"""Predictive maintenance model.

Trains a GradientBoosting regressor on synthetic (dummy) data when no real
dataset is provided. The trained model is cached to `models/predictive_model.joblib`
so subsequent runs load the persisted model instantly.

Features: usage_hours, temperature, cpu_usage, vibration, load_factor, years_operation
Target:   remaining useful life (RUL) in days
"""
import os

import numpy as np
from joblib import dump, load

FEATURES = [
    "usage_hours",
    "temperature",
    "cpu_usage",
    "vibration",
    "load_factor",
    "years_operation",
]


def _generate_dummy_data(n: int = 2000, seed: int = 42):
    """Synthetic asset telemetry where heavier usage shortens useful life."""
    rng = np.random.default_rng(seed)
    data = {
        "usage_hours": rng.uniform(0, 800, n),
        "temperature": rng.normal(60, 12, n),
        "cpu_usage": rng.uniform(20, 100, n),
        "vibration": rng.normal(2.5, 1.5, n),
        "load_factor": rng.uniform(0.3, 1.0, n),
        "years_operation": rng.uniform(0.5, 8, n),
    }
    X = np.column_stack([data[feature] for feature in FEATURES])

    usage, temp, cpu, vib, load, years = (
        data[f] for f in FEATURES
    )
    rul = (
        400
        - usage * 0.85
        - temp * 1.4
        - cpu * 1.1
        - vib * 6.0
        - load * 90.0
        - years * 25.0
    ) + rng.normal(0, 20, n)
    y = np.clip(rul, 1, 400)
    return X, y


def train_model(path: str | None = None, n: int = 2000):
    """Train (or re-train) the predictive model, optionally persisting it."""
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.model_selection import train_test_split

    X, y = _generate_dummy_data(n)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = GradientBoostingRegressor(
        n_estimators=120, learning_rate=0.08, max_depth=4, random_state=42
    )
    model.fit(X_train, y_train)

    if path:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        dump(model, path)

    return model


def load_model(path: str | None = None):
    """Load a persisted model, or train a fresh one as a fallback.

    Returns (model, from_file) where from_file is True when a persisted
    model was successfully loaded.
    """
    if path and os.path.exists(path):
        try:
            return load(path), True
        except Exception:
            pass
    return train_model(path=path), False
