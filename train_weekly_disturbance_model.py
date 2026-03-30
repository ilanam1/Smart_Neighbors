import os
from datetime import datetime, timedelta, timezone
from dateutil.relativedelta import relativedelta

import numpy as np
import pandas as pd
from supabase import create_client, Client

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score, accuracy_score
from sklearn.model_selection import train_test_split
import joblib


# =========================================================
# הגדרות בסיס
# =========================================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # חשוב: service role
MODEL_PATH = "weekly_disturbance_model.joblib"

DISTURBANCE_TYPES = ["NOISE", "CLEANLINESS", "SAFETY", "OTHER"]


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# =========================================================
# שליפה מה-DB
# =========================================================
def fetch_table_paginated(supabase: Client, table_name: str, select_query: str = "*", page_size: int = 1000):
    all_rows = []
    start = 0

    while True:
        end = start + page_size - 1
        response = supabase.table(table_name).select(select_query).range(start, end).execute()
        rows = response.data or []
        all_rows.extend(rows)

        if len(rows) < page_size:
            break

        start += page_size

    return pd.DataFrame(all_rows)


def fetch_data():
    supabase = get_supabase()

    reports = fetch_table_paginated(
        supabase,
        "disturbance_reports",
        "id, auth_user_id, type, severity, description, occurred_at, location, status, created_at, updated_at, building_id"
    )

    assignments = fetch_table_paginated(
        supabase,
        "disturbance_assignments",
        "id, report_id, provider_id, status, created_by, created_at, updated_at, last_update_note, building_id"
    )

    return reports, assignments


# =========================================================
# עיבוד ראשוני
# =========================================================
def prepare_reports(reports: pd.DataFrame) -> pd.DataFrame:
    if reports.empty:
        return reports

    reports = reports.copy()
    reports = reports.dropna(subset=["building_id", "type", "created_at"])

    reports["created_at"] = pd.to_datetime(reports["created_at"], utc=True, errors="coerce")
    reports["occurred_at"] = pd.to_datetime(reports["occurred_at"], utc=True, errors="coerce")
    reports["updated_at"] = pd.to_datetime(reports["updated_at"], utc=True, errors="coerce")

    reports = reports.dropna(subset=["created_at"])
    reports["week_start"] = reports["created_at"].dt.to_period("W-MON").apply(lambda r: r.start_time)
    reports["week_start"] = pd.to_datetime(reports["week_start"], utc=True)

    reports["is_high_severity"] = (reports["severity"] == "HIGH").astype(int)
    reports["is_open"] = (reports["status"].isin(["OPEN", "IN_PROGRESS"])).astype(int)

    return reports


def prepare_assignments(assignments: pd.DataFrame) -> pd.DataFrame:
    if assignments.empty:
        return assignments

    assignments = assignments.copy()
    assignments = assignments.dropna(subset=["building_id", "report_id", "created_at"])

    assignments["created_at"] = pd.to_datetime(assignments["created_at"], utc=True, errors="coerce")
    assignments["updated_at"] = pd.to_datetime(assignments["updated_at"], utc=True, errors="coerce")
    assignments = assignments.dropna(subset=["created_at"])

    assignments["week_start"] = assignments["created_at"].dt.to_period("W-MON").apply(lambda r: r.start_time)
    assignments["week_start"] = pd.to_datetime(assignments["week_start"], utc=True)

    assignments["is_done"] = (assignments["status"] == "DONE").astype(int)

    return assignments


# =========================================================
# יצירת dataset שבועי
# =========================================================
def get_all_week_starts(min_date: pd.Timestamp, max_date: pd.Timestamp):
    current = min_date.to_period("W-MON").start_time
    current = pd.Timestamp(current, tz="UTC")

    last = max_date.to_period("W-MON").start_time
    last = pd.Timestamp(last, tz="UTC")

    weeks = []
    while current <= last:
        weeks.append(current)
        current += pd.Timedelta(days=7)
    return weeks


def build_training_dataset(reports: pd.DataFrame, assignments: pd.DataFrame) -> pd.DataFrame:
    if reports.empty:
        return pd.DataFrame()

    buildings = sorted(reports["building_id"].dropna().unique().tolist())
    min_date = reports["created_at"].min()
    max_date = reports["created_at"].max()

    all_weeks = get_all_week_starts(min_date, max_date)

    rows = []

    # מיפוי assignment אל סוג המטרד דרך report_id
    report_type_map = reports[["id", "type"]].rename(columns={"id": "report_id", "type": "report_type"})

    if not assignments.empty:
        assignments = assignments.merge(report_type_map, on="report_id", how="left")

    for building_id in buildings:
        building_reports = reports[reports["building_id"] == building_id].copy()

        if building_reports.empty:
            continue

        building_assignments = assignments[assignments["building_id"] == building_id].copy() if not assignments.empty else pd.DataFrame()

        for disturbance_type in DISTURBANCE_TYPES:
            type_reports = building_reports[building_reports["type"] == disturbance_type].copy()
            type_assignments = (
                building_assignments[building_assignments["report_type"] == disturbance_type].copy()
                if not building_assignments.empty else pd.DataFrame()
            )

            for week_start in all_weeks[:-1]:
                last_1w_start = week_start - pd.Timedelta(days=7)
                last_2w_start = week_start - pd.Timedelta(days=14)
                last_4w_start = week_start - pd.Timedelta(days=28)
                next_week_start = week_start + pd.Timedelta(days=7)
                next_week_end = next_week_start + pd.Timedelta(days=7)

                reports_last_1w = type_reports[
                    (type_reports["created_at"] >= last_1w_start) &
                    (type_reports["created_at"] < week_start)
                ]

                reports_last_2w = type_reports[
                    (type_reports["created_at"] >= last_2w_start) &
                    (type_reports["created_at"] < week_start)
                ]

                reports_last_4w = type_reports[
                    (type_reports["created_at"] >= last_4w_start) &
                    (type_reports["created_at"] < week_start)
                ]

                building_reports_last_4w = building_reports[
                    (building_reports["created_at"] >= last_4w_start) &
                    (building_reports["created_at"] < week_start)
                ]

                future_reports = type_reports[
                    (type_reports["created_at"] >= next_week_start) &
                    (type_reports["created_at"] < next_week_end)
                ]

                if not type_assignments.empty:
                    assignments_last_4w = type_assignments[
                        (type_assignments["created_at"] >= last_4w_start) &
                        (type_assignments["created_at"] < week_start)
                    ]
                else:
                    assignments_last_4w = pd.DataFrame()

                reports_prev_4w = type_reports[
                    (type_reports["created_at"] >= (last_4w_start - pd.Timedelta(days=28))) &
                    (type_reports["created_at"] < last_4w_start)
                ]

                recent_count = len(reports_last_4w)
                prev_count = len(reports_prev_4w)
                trend_delta = recent_count - prev_count

                row = {
                    "building_id": building_id,
                    "type": disturbance_type,
                    "week_start": week_start,
                    "month": week_start.month,
                    "week_of_year": int(week_start.isocalendar().week),

                    "reports_last_1w": len(reports_last_1w),
                    "reports_last_2w": len(reports_last_2w),
                    "reports_last_4w": recent_count,
                    "reports_all_types_last_4w": len(building_reports_last_4w),

                    "high_severity_last_4w": int(reports_last_4w["is_high_severity"].sum()) if not reports_last_4w.empty else 0,
                    "open_reports_last_4w": int(reports_last_4w["is_open"].sum()) if not reports_last_4w.empty else 0,

                    "assignments_last_4w": len(assignments_last_4w),
                    "done_assignments_last_4w": int(assignments_last_4w["is_done"].sum()) if not assignments_last_4w.empty else 0,

                    "trend_delta_4w_vs_prev_4w": trend_delta,
                    "had_any_report_last_4w": int(recent_count > 0),

                    "target_next_week": int(len(future_reports) > 0),
                }
                rows.append(row)

    dataset = pd.DataFrame(rows)

    if dataset.empty:
        return dataset

    dataset = dataset.sort_values(["building_id", "type", "week_start"]).reset_index(drop=True)
    return dataset


# =========================================================
# אימון מודל
# =========================================================
def train_model(dataset: pd.DataFrame):
    if dataset.empty:
        raise ValueError("Dataset is empty, cannot train model.")

    feature_cols = [
        "building_id",
        "type",
        "month",
        "week_of_year",
        "reports_last_1w",
        "reports_last_2w",
        "reports_last_4w",
        "reports_all_types_last_4w",
        "high_severity_last_4w",
        "open_reports_last_4w",
        "assignments_last_4w",
        "done_assignments_last_4w",
        "trend_delta_4w_vs_prev_4w",
        "had_any_report_last_4w",
    ]

    X = dataset[feature_cols]
    y = dataset["target_next_week"]

    categorical_features = ["building_id", "type"]
    numeric_features = [c for c in feature_cols if c not in categorical_features]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="most_frequent")),
                    ("onehot", OneHotEncoder(handle_unknown="ignore"))
                ]),
                categorical_features,
            ),
            (
                "num",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="constant", fill_value=0))
                ]),
                numeric_features,
            )
        ]
    )

    model = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(
            n_estimators=250,
            max_depth=8,
            min_samples_leaf=2,
            random_state=42,
            class_weight="balanced"
        ))
    ])

    # פיצול כרונולוגי ולא אקראי – יותר נכון לבעיה של זמן
    dataset_sorted = dataset.sort_values("week_start").reset_index(drop=True)
    split_idx = int(len(dataset_sorted) * 0.8)

    train_df = dataset_sorted.iloc[:split_idx]
    test_df = dataset_sorted.iloc[split_idx:]

    X_train = train_df[feature_cols]
    y_train = train_df["target_next_week"]

    X_test = test_df[feature_cols]
    y_test = test_df["target_next_week"]

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print("\n===== MODEL EVALUATION =====")
    print("Accuracy:", round(accuracy_score(y_test, y_pred), 4))

    try:
        auc = roc_auc_score(y_test, y_prob)
        print("ROC-AUC:", round(auc, 4))
    except Exception:
        print("ROC-AUC: could not be computed")

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, digits=4))

    joblib.dump(model, MODEL_PATH)
    print(f"\nModel saved to: {MODEL_PATH}")

    return model, feature_cols


# =========================================================
# יצירת תחזית לשבוע הקרוב
# =========================================================
def build_future_features(reports: pd.DataFrame, assignments: pd.DataFrame) -> pd.DataFrame:
    if reports.empty:
        return pd.DataFrame()

    now = pd.Timestamp.now(tz="UTC")
    current_week_start = pd.Timestamp(now.to_period("W-MON").start_time, tz="UTC")
    target_week_start = current_week_start + pd.Timedelta(days=7)
    target_week_end = target_week_start + pd.Timedelta(days=7)

    buildings = sorted(reports["building_id"].dropna().unique().tolist())
    rows = []

    report_type_map = reports[["id", "type"]].rename(columns={"id": "report_id", "type": "report_type"})
    if not assignments.empty:
        assignments = assignments.merge(report_type_map, on="report_id", how="left")

    for building_id in buildings:
        building_reports = reports[reports["building_id"] == building_id].copy()
        building_assignments = assignments[assignments["building_id"] == building_id].copy() if not assignments.empty else pd.DataFrame()

        for disturbance_type in DISTURBANCE_TYPES:
            type_reports = building_reports[building_reports["type"] == disturbance_type].copy()
            type_assignments = (
                building_assignments[building_assignments["report_type"] == disturbance_type].copy()
                if not building_assignments.empty else pd.DataFrame()
            )

            last_1w_start = current_week_start - pd.Timedelta(days=7)
            last_2w_start = current_week_start - pd.Timedelta(days=14)
            last_4w_start = current_week_start - pd.Timedelta(days=28)

            reports_last_1w = type_reports[
                (type_reports["created_at"] >= last_1w_start) &
                (type_reports["created_at"] < current_week_start)
            ]

            reports_last_2w = type_reports[
                (type_reports["created_at"] >= last_2w_start) &
                (type_reports["created_at"] < current_week_start)
            ]

            reports_last_4w = type_reports[
                (type_reports["created_at"] >= last_4w_start) &
                (type_reports["created_at"] < current_week_start)
            ]

            building_reports_last_4w = building_reports[
                (building_reports["created_at"] >= last_4w_start) &
                (building_reports["created_at"] < current_week_start)
            ]

            if not type_assignments.empty:
                assignments_last_4w = type_assignments[
                    (type_assignments["created_at"] >= last_4w_start) &
                    (type_assignments["created_at"] < current_week_start)
                ]
            else:
                assignments_last_4w = pd.DataFrame()

            reports_prev_4w = type_reports[
                (type_reports["created_at"] >= (last_4w_start - pd.Timedelta(days=28))) &
                (type_reports["created_at"] < last_4w_start)
            ]

            recent_count = len(reports_last_4w)
            prev_count = len(reports_prev_4w)

            row = {
                "building_id": building_id,
                "type": disturbance_type,
                "month": target_week_start.month,
                "week_of_year": int(target_week_start.isocalendar().week),

                "reports_last_1w": len(reports_last_1w),
                "reports_last_2w": len(reports_last_2w),
                "reports_last_4w": recent_count,
                "reports_all_types_last_4w": len(building_reports_last_4w),

                "high_severity_last_4w": int(reports_last_4w["is_high_severity"].sum()) if not reports_last_4w.empty else 0,
                "open_reports_last_4w": int(reports_last_4w["is_open"].sum()) if not reports_last_4w.empty else 0,

                "assignments_last_4w": len(assignments_last_4w),
                "done_assignments_last_4w": int(assignments_last_4w["is_done"].sum()) if not assignments_last_4w.empty else 0,

                "trend_delta_4w_vs_prev_4w": recent_count - prev_count,
                "had_any_report_last_4w": int(recent_count > 0),

                "target_week_start": target_week_start.date().isoformat(),
                "target_week_end": (target_week_end - pd.Timedelta(days=1)).date().isoformat(),
            }
            rows.append(row)

    return pd.DataFrame(rows)


def probability_to_risk(prob: float) -> str:
    if prob >= 0.67:
        return "HIGH"
    if prob >= 0.34:
        return "MEDIUM"
    return "LOW"


def build_explanation(row: pd.Series) -> str:
    reasons = []

    if row["reports_last_4w"] >= 4:
        reasons.append("זוהתה תדירות גבוהה של דיווחים בחודש האחרון")
    elif row["reports_last_4w"] >= 2:
        reasons.append("נרשמו מספר דיווחים לאחרונה")

    if row["high_severity_last_4w"] >= 1:
        reasons.append("לפחות חלק מהדיווחים האחרונים היו בחומרה גבוהה")

    if row["trend_delta_4w_vs_prev_4w"] > 0:
        reasons.append("יש מגמת עלייה ביחס לתקופה הקודמת")

    if row["assignments_last_4w"] >= 1:
        reasons.append("נדרש טיפול מקצועי לאחרונה")

    if not reasons:
        reasons.append("לא זוהו דפוסים חריגים בתקופה האחרונה")

    return ". ".join(reasons) + "."


def recommended_action(disturbance_type: str, risk_level: str) -> str:
    action_map = {
        "NOISE": "מומלץ לעקוב אחר דיווחי רעש ולהיערך לתקשורת עם הדיירים במידת הצורך.",
        "CLEANLINESS": "מומלץ לבדוק תדירות ניקיון, פינוי אשפה ותחזוקה שוטפת.",
        "SAFETY": "מומלץ לבצע בדיקה יזומה של מפגעים בטיחותיים ולהיות זמינים להזמנת איש מקצוע.",
        "OTHER": "מומלץ לעקוב אחר הדיווחים החריגים ולהיערך בהתאם."
    }

    base = action_map.get(disturbance_type, "מומלץ לעקוב ולהיערך בהתאם.")

    if risk_level == "HIGH":
        return "סיכון גבוה: " + base
    if risk_level == "MEDIUM":
        return "סיכון בינוני: " + base
    return "סיכון נמוך: אין צורך בפעולה מיידית, אך מומלץ להמשיך במעקב."


def save_predictions_to_supabase(predictions_df: pd.DataFrame):
    if predictions_df.empty:
        print("No predictions to save.")
        return

    supabase = get_supabase()

    target_week_start = predictions_df["target_week_start"].iloc[0]

    # מנקה תחזיות ישנות לאותו שבוע כדי לא ליצור כפילויות
    delete_response = (
        supabase.table("weekly_disturbance_predictions")
        .delete()
        .eq("target_week_start", target_week_start)
        .execute()
    )

    payload = predictions_df.to_dict(orient="records")
    supabase.table("weekly_disturbance_predictions").insert(payload).execute()
    print(f"Saved {len(payload)} predictions to Supabase.")


def main():
    print("Fetching data from Supabase...")
    reports, assignments = fetch_data()

    print("Preparing data...")
    reports = prepare_reports(reports)
    assignments = prepare_assignments(assignments)

    if reports.empty:
        print("No reports found. Exiting.")
        return

    print("Building training dataset...")
    dataset = build_training_dataset(reports, assignments)

    if dataset.empty:
        print("Dataset is empty after feature engineering. Exiting.")
        return

    print(f"Training rows: {len(dataset)}")
    model, feature_cols = train_model(dataset)

    print("Building future features...")
    future_df = build_future_features(reports, assignments)
    if future_df.empty:
        print("No future features generated. Exiting.")
        return

    X_future = future_df[feature_cols]
    probs = model.predict_proba(X_future)[:, 1]
    labels = (probs >= 0.5).astype(int)

    future_df["probability"] = probs
    future_df["predicted_label"] = labels.astype(bool)
    future_df["risk_level"] = future_df["probability"].apply(probability_to_risk)
    future_df["explanation"] = future_df.apply(build_explanation, axis=1)
    future_df["recommended_action"] = future_df.apply(
        lambda row: recommended_action(row["type"], row["risk_level"]),
        axis=1
    )

    predictions = future_df[[
        "building_id",
        "type",
        "target_week_start",
        "target_week_end",
        "probability",
        "risk_level",
        "predicted_label",
        "explanation",
        "recommended_action"
    ]].copy()

    predictions = predictions.rename(columns={
        "type": "disturbance_type"
    })

    predictions["prediction_date"] = pd.Timestamp.now(tz="UTC").date().isoformat()
    predictions["model_name"] = "RandomForestClassifier"

    predictions["model_version"] = "v1"
    predictions["probability"] = predictions["probability"].round(5)

    print("\nSample predictions:")
    print(predictions.head(10))

    print("\nSaving predictions...")
    save_predictions_to_supabase(predictions)
    print("Done.")


if __name__ == "__main__":
    main()