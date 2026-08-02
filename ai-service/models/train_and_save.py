"""Pre-train and persist the predictive model to models/predictive_model.joblib.

Run once (or whenever the training data changes):
    python models/train_and_save.py
"""
from pathlib import Path

from predictive_model import train_model

if __name__ == "__main__":
    output = Path(__file__).resolve().parent / "predictive_model.joblib"
    train_model(path=str(output))
    print(f"Model trained and saved to {output}")
