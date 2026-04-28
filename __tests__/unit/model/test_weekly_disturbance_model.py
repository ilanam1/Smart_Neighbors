import importlib.util
from pathlib import Path

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[3]
MODEL_FILE = ROOT_DIR / "train_weekly_disturbance_model.py"

if not MODEL_FILE.exists():
    raise FileNotFoundError(f"Model file not found: {MODEL_FILE}")

spec = importlib.util.spec_from_file_location(
    "tested_train_weekly_disturbance_model",
    str(MODEL_FILE)
)

model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)


def test_probability_to_risk_returns_correct_levels():
    assert model.probability_to_risk(0.80) == "HIGH"
    assert model.probability_to_risk(0.50) == "MEDIUM"
    assert model.probability_to_risk(0.10) == "LOW"


def test_recommended_action_for_high_noise():
    result = model.recommended_action("NOISE", "HIGH")

    assert "סיכון גבוה" in result
    assert "רעש" in result


def test_recommended_action_for_low_risk():
    result = model.recommended_action("SAFETY", "LOW")

    assert "סיכון נמוך" in result
    assert "אין צורך בפעולה מיידית" in result


def test_build_explanation_with_high_activity():
    row = pd.Series({
        "reports_last_4w": 5,
        "high_severity_last_4w": 1,
        "trend_delta_4w_vs_prev_4w": 2,
        "assignments_last_4w": 1,
    })

    explanation = model.build_explanation(row)

    assert "תדירות גבוהה" in explanation
    assert "חומרה גבוהה" in explanation
    assert "מגמת עלייה" in explanation
    assert "טיפול מקצועי" in explanation


def test_build_explanation_without_special_patterns():
    row = pd.Series({
        "reports_last_4w": 0,
        "high_severity_last_4w": 0,
        "trend_delta_4w_vs_prev_4w": 0,
        "assignments_last_4w": 0,
    })

    explanation = model.build_explanation(row)

    assert "לא זוהו דפוסים חריגים" in explanation


def test_prepare_reports_adds_engineered_columns():
    reports = pd.DataFrame([
        {
            "id": "r1",
            "auth_user_id": "u1",
            "type": "NOISE",
            "severity": "HIGH",
            "description": "רעש בלילה",
            "occurred_at": "2026-04-01T10:00:00Z",
            "location": "קומה 2",
            "status": "OPEN",
            "created_at": "2026-04-01T10:00:00Z",
            "updated_at": "2026-04-01T10:00:00Z",
            "building_id": "b1",
        }
    ])

    result = model.prepare_reports(reports)

    assert not result.empty
    assert "week_start" in result.columns
    assert "is_high_severity" in result.columns
    assert "is_open" in result.columns
    assert int(result.iloc[0]["is_high_severity"]) == 1
    assert int(result.iloc[0]["is_open"]) == 1


def test_prepare_assignments_adds_is_done_column():
    assignments = pd.DataFrame([
        {
            "id": "a1",
            "report_id": "r1",
            "provider_id": "p1",
            "status": "DONE",
            "created_by": "u1",
            "created_at": "2026-04-01T10:00:00Z",
            "updated_at": "2026-04-01T10:00:00Z",
            "last_update_note": "טופל",
            "building_id": "b1",
        }
    ])

    result = model.prepare_assignments(assignments)

    assert not result.empty
    assert "week_start" in result.columns
    assert "is_done" in result.columns
    assert int(result.iloc[0]["is_done"]) == 1


def test_build_training_dataset_creates_rows():
    reports = pd.DataFrame([
        {
            "id": "r1",
            "type": "NOISE",
            "severity": "HIGH",
            "status": "OPEN",
            "created_at": "2026-04-01T10:00:00Z",
            "occurred_at": "2026-04-01T10:00:00Z",
            "updated_at": "2026-04-01T10:00:00Z",
            "building_id": "b1",
        },
        {
            "id": "r2",
            "type": "NOISE",
            "severity": "LOW",
            "status": "RESOLVED",
            "created_at": "2026-04-15T10:00:00Z",
            "occurred_at": "2026-04-15T10:00:00Z",
            "updated_at": "2026-04-15T10:00:00Z",
            "building_id": "b1",
        },
    ])

    assignments = pd.DataFrame([
        {
            "id": "a1",
            "report_id": "r1",
            "provider_id": "p1",
            "status": "DONE",
            "created_by": "u1",
            "created_at": "2026-04-02T10:00:00Z",
            "updated_at": "2026-04-02T10:00:00Z",
            "last_update_note": "טופל",
            "building_id": "b1",
        }
    ])

    prepared_reports = model.prepare_reports(reports)
    prepared_assignments = model.prepare_assignments(assignments)

    dataset = model.build_training_dataset(prepared_reports, prepared_assignments)

    assert not dataset.empty
    assert "target_next_week" in dataset.columns
    assert "reports_last_4w" in dataset.columns
    assert "trend_delta_4w_vs_prev_4w" in dataset.columns