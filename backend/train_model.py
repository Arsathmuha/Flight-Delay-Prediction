"""
Train XGBoost model for flight delay prediction.
Outputs: trained model, feature importance, evaluation metrics.
"""

import pandas as pd
import numpy as np
import pickle
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    roc_auc_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix
)
import xgboost as xgb

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'flights.csv')
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

def load_and_prepare_data():
    df = pd.read_csv(DATA_PATH)

    le_carrier = LabelEncoder()
    le_origin = LabelEncoder()
    le_dest = LabelEncoder()

    df['carrier_enc'] = le_carrier.fit_transform(df['carrier'])
    df['origin_enc'] = le_origin.fit_transform(df['origin'])
    df['dest_enc'] = le_dest.fit_transform(df['dest'])

    # Engineered features
    df['is_evening'] = (df['dep_hour'] >= 18).astype(int)
    df['is_winter'] = df['month'].isin([12, 1, 2]).astype(int)
    df['is_summer'] = df['month'].isin([6, 7, 8]).astype(int)
    df['is_weekend'] = df['day_of_week'].isin([4, 5, 6]).astype(int)
    df['route_congestion'] = df['origin_congestion_score'] + df['dest_congestion_score']
    df['dep_hour_sin'] = np.sin(2 * np.pi * df['dep_hour'] / 24)
    df['dep_hour_cos'] = np.cos(2 * np.pi * df['dep_hour'] / 24)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

    feature_cols = [
        'carrier_enc', 'origin_enc', 'dest_enc', 'dep_hour', 'day_of_week',
        'month', 'distance', 'origin_congestion_score', 'dest_congestion_score',
        'prior_leg_delay', 'taxi_out', 'is_evening', 'is_winter', 'is_summer',
        'is_weekend', 'route_congestion', 'dep_hour_sin', 'dep_hour_cos',
        'month_sin', 'month_cos'
    ]

    X = df[feature_cols]
    y = df['is_delayed']

    encoders = {
        'carrier': le_carrier,
        'origin': le_origin,
        'dest': le_dest
    }

    return X, y, feature_cols, encoders, df


def train():
    print("Loading data...")
    X, y, feature_cols, encoders, df = load_and_prepare_data()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training set: {len(X_train)} | Test set: {len(X_test)}")
    print(f"Delay rate - Train: {y_train.mean():.3f} | Test: {y_test.mean():.3f}")

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=10,
        gamma=0.5,
        reg_alpha=1.0,
        reg_lambda=2.0,
        scale_pos_weight=len(y_train[y_train==0]) / len(y_train[y_train==1]),
        random_state=42,
        eval_metric='auc',
    )

    print("Training XGBoost model...")
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50
    )

    # Predictions
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    # Check probability distribution
    print(f"\nProbability distribution:")
    print(f"  Min: {y_prob.min():.4f}")
    print(f"  Max: {y_prob.max():.4f}")
    print(f"  Mean: {y_prob.mean():.4f}")
    print(f"  Median: {np.median(y_prob):.4f}")
    print(f"  Std: {y_prob.std():.4f}")
    print(f"  % in [0.2, 0.8]: {((y_prob >= 0.2) & (y_prob <= 0.8)).mean():.1%}")

    # Metrics
    auc_roc = roc_auc_score(y_test, y_prob)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    print(f"\n{'='*50}")
    print(f"MODEL EVALUATION RESULTS")
    print(f"{'='*50}")
    print(f"AUC-ROC:   {auc_roc:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['On-Time', 'Delayed']))

    # Feature importance
    print("Computing feature importance...")
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_,
        'shap_mean': model.feature_importances_,
    }).sort_values('shap_mean', ascending=False)

    print("\nTop Feature Importance:")
    print(feature_importance[['feature', 'shap_mean']].head(10).to_string(index=False))

    # Save model and artifacts
    with open(os.path.join(MODEL_DIR, 'xgb_model.pkl'), 'wb') as f:
        pickle.dump(model, f)

    with open(os.path.join(MODEL_DIR, 'encoders.pkl'), 'wb') as f:
        pickle.dump(encoders, f)

    with open(os.path.join(MODEL_DIR, 'feature_cols.json'), 'w') as f:
        json.dump(feature_cols, f)

    metrics = {
        'auc_roc': round(auc_roc, 4),
        'precision': round(precision, 4),
        'recall': round(recall, 4),
        'f1_score': round(f1, 4),
        'train_size': len(X_train),
        'test_size': len(X_test),
        'delay_rate': round(y.mean(), 4),
        'feature_importance': feature_importance[['feature', 'importance', 'shap_mean']].to_dict('records'),
        'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
    }

    with open(os.path.join(MODEL_DIR, 'metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)

    # Save carrier/airport stats for API
    carrier_stats = df.groupby('carrier').agg(
        delay_rate=('is_delayed', 'mean'),
        avg_delay=('arr_delay', 'mean'),
        total_flights=('is_delayed', 'count')
    ).round(4).to_dict('index')

    airport_stats = df.groupby('origin').agg(
        delay_rate=('is_delayed', 'mean'),
        avg_delay=('arr_delay', 'mean'),
        congestion=('origin_congestion_score', 'first'),
        total_flights=('is_delayed', 'count')
    ).round(4).to_dict('index')

    monthly_stats = df.groupby('month').agg(
        delay_rate=('is_delayed', 'mean'),
        total_flights=('is_delayed', 'count')
    ).round(4).to_dict('index')

    hourly_stats = df.groupby('dep_hour').agg(
        delay_rate=('is_delayed', 'mean'),
        total_flights=('is_delayed', 'count')
    ).round(4).to_dict('index')

    stats = {
        'carriers': carrier_stats,
        'airports': airport_stats,
        'monthly': {str(k): v for k, v in monthly_stats.items()},
        'hourly': {str(k): v for k, v in hourly_stats.items()}
    }

    with open(os.path.join(MODEL_DIR, 'stats.json'), 'w') as f:
        json.dump(stats, f, indent=2)

    print(f"\nModel and artifacts saved to {MODEL_DIR}")
    print("Training complete!")

    return model, metrics


if __name__ == '__main__':
    train()
