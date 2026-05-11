# ML/severity_model/train_severity_model.py
# אימון מודל ML אמיתי לחיזוי חומרת מטרדים בבניין
# המודל מאומן על דאטה סינתטי ראשוני, ומייצא JSON לשימוש באפליקציית React Native

import json
import random
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split


RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

MODEL_VERSION = "ml-severity-logreg-v1.0"

PROJECT_ROOT = Path(__file__).resolve().parents[2]
API_DIR = PROJECT_ROOT / "API"
CURRENT_DIR = Path(__file__).resolve().parent

JSON_MODEL_PATH = API_DIR / "disturbance_severity_model.json"
JOBLIB_MODEL_PATH = CURRENT_DIR / "disturbance_severity_model.joblib"
TRAINING_REPORT_PATH = CURRENT_DIR / "training_report.txt"
TRAINING_DATA_PATH = CURRENT_DIR / "synthetic_disturbance_training_data.csv"


TYPE_VALUES = ["NOISE", "CLEANLINESS", "SAFETY", "OTHER"]
SELECTED_SEVERITIES = ["LOW", "MEDIUM", "HIGH"]
TARGET_CLASSES = ["LOW", "MEDIUM", "HIGH"]

LOCATIONS = [
    "בלובי",
    "בחדר מדרגות",
    "בקומה 1",
    "בקומה 2",
    "בקומה 5",
    "בחניה",
    "בכניסה לבניין",
    "ליד ארון החשמל",
    "ליד המעלית",
    "במחסן",
    "בחדר אשפה",
    "בגינה",
    "",
]

LOW_EXAMPLES = {
    "NOISE": [
        "שומעים מעט רעש מהשכנים במהלך היום",
        "יש רעש חלש מדי פעם אבל לא דחוף",
        "מישהו הזיז רהיטים לזמן קצר",
        "רעש קל מהחצר בשעות היום",
        "יש דיבורים בקומה אבל זה לא מפריע מאוד",
    ],
    "CLEANLINESS": [
        "יש קצת לכלוך בלובי",
        "פח קטן לא רוקן אבל לא דחוף",
        "יש כמה ניירות על הרצפה",
        "צריך ניקיון רגיל בחדר מדרגות",
        "יש מעט אבק ליד הכניסה",
    ],
    "SAFETY": [
        "מעקה מעט רופף אבל לא נראה מסוכן כרגע",
        "יש בורג חסר בשלט של הבניין",
        "תאורה חלשה באזור הכניסה",
        "מרצפת מעט עקומה ללא סכנה מיידית",
        "דלת המחסן לא נסגרת טוב",
    ],
    "OTHER": [
        "בקשה כללית לבדיקה כשאפשר",
        "יש הערה קטנה לגבי תחזוקה",
        "צריך לבדוק משהו לא דחוף",
        "יש בעיה קטנה שאפשר לטפל בה בהמשך",
        "דיווח כללי ללא סכנה",
    ],
}

MEDIUM_EXAMPLES = {
    "NOISE": [
        "מוזיקה חזקה מהדירה מעל כבר כמה שעות",
        "רעש חזק בלילה שמפריע לדיירים",
        "צעקות ורעש בחדר מדרגות",
        "שיפוצים מרעישים בשעות לא מתאימות",
        "רעש מתמשך מהחניה",
    ],
    "CLEANLINESS": [
        "יש הרבה אשפה בחדר אשפה וריח רע",
        "לכלוך חריג בחדר מדרגות",
        "שקיות זבל נשארו ליד הכניסה",
        "יש ריח לא נעים בלובי כבר יומיים",
        "נזילה קטנה שגרמה לרטיבות בקיר",
    ],
    "SAFETY": [
        "תאורה לא עובדת בחדר מדרגות וזה מסוכן בלילה",
        "דלת כניסה לא נסגרת ויש חשש ביטחוני",
        "מרצפת שבורה שעלולה לגרום לנפילה",
        "יש ונדליזם ליד המעלית",
        "מעקה רופף שצריך תיקון בהקדם",
    ],
    "OTHER": [
        "בעיה שחוזרת כמה פעמים ודורשת טיפול",
        "תקלה שמשפיעה על כמה דיירים",
        "נדרש טיפול של ועד הבית בזמן הקרוב",
        "יש בעיה מתמשכת בבניין",
        "תקלה לא מסוכנת אבל מפריעה לדיירים",
    ],
}

HIGH_EXAMPLES = {
    "NOISE": [
        "רעש חריג מאוד באמצע הלילה עם צעקות חזקות",
        "רעש חזק מאוד שמונע מדיירים לישון כבר כמה לילות",
        "קולות חזקים של שבירה ואלימות מהדירה",
        "רעש חירום חזק מהחניה בשעות הלילה",
        "מטרד רעש קיצוני ומתמשך",
    ],
    "CLEANLINESS": [
        "הצפה בחדר מדרגות ומים זורמים",
        "ביוב עולה ויש ריח חריף מאוד",
        "נזילה חזקה שגורמת להצפה",
        "אשפה מסוכנת מפוזרת בכניסה לבניין",
        "לכלוך חמור שעלול לגרום לסכנה בריאותית",
    ],
    "SAFETY": [
        "יש ריח שרוף ליד ארון החשמל",
        "יש ניצוצות מארון החשמל בלובי",
        "ריח גז חזק בבניין",
        "מעלית תקועה עם אנשים בפנים",
        "חוטי חשמל חשופים ליד הכניסה",
        "שריפה קטנה בלובי",
        "עשן יוצא מחדר החשמל",
        "זכוכית שבורה מסוכנת ליד הכניסה",
        "קיר או תקרה נראים לפני קריסה",
        "יש סכנת התחשמלות",
    ],
    "OTHER": [
        "אירוע חירום שדורש טיפול מיידי",
        "בעיה חמורה שמסכנת דיירים",
        "תקלה דחופה מאוד בבניין",
        "מצב מסוכן שמצריך טיפול בהול",
        "אירוע חריג שמצריך תגובה מיידית",
    ],
}


def create_training_rows():
    rows = []

    severity_sources = {
        "LOW": LOW_EXAMPLES,
        "MEDIUM": MEDIUM_EXAMPLES,
        "HIGH": HIGH_EXAMPLES,
    }

    # יצירת דאטה מאוזן יחסית לכל רמת חומרה
    for target_severity, examples_by_type in severity_sources.items():
        for disturbance_type, examples in examples_by_type.items():
            for example in examples:
                for _ in range(12):
                    location = random.choice(LOCATIONS)

                    # לפעמים הדייר בוחר חומרה נכונה ולפעמים טועה
                    if random.random() < 0.65:
                        selected_severity = target_severity
                    else:
                        selected_severity = random.choice(SELECTED_SEVERITIES)

                    description = example

                    # וריאציות קטנות כדי שהמודל לא ישנן רק משפטים זהים
                    if random.random() < 0.25:
                        description += " זה קורה כבר כמה פעמים"
                    if random.random() < 0.20:
                        description += " נא לטפל בהקדם"
                    if random.random() < 0.15:
                        description += " הדיירים התלוננו על זה"

                    rows.append({
                        "type": disturbance_type,
                        "selected_severity": selected_severity,
                        "description": description,
                        "location": location,
                        "target_severity": target_severity,
                    })

    random.shuffle(rows)
    return pd.DataFrame(rows)


def build_model_text(row):
    """
    מאחד את כל שדות הקלט לטקסט אחד.
    כך אפשר להשתמש ב-TF-IDF גם עבור סוג התקלה וגם עבור החומרה שהדייר בחר.
    """
    disturbance_type = str(row["type"])
    selected_severity = str(row["selected_severity"])
    description = str(row["description"])
    location = str(row["location"])

    return (
        f"type_{disturbance_type} "
        f"selected_{selected_severity} "
        f"location_{location} "
        f"{description}"
    )


def train_model():
    df = create_training_rows()
    df["model_text"] = df.apply(build_model_text, axis=1)

    TRAINING_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(TRAINING_DATA_PATH, index=False, encoding="utf-8-sig")

    X = df["model_text"]
    y = df["target_severity"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.22,
        random_state=RANDOM_SEED,
        stratify=y,
    )

    vectorizer = TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        max_features=900,
        token_pattern=r"(?u)\b\w+\b",
        sublinear_tf=True,
    )

    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    model = LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        random_state=RANDOM_SEED,
    )

    model.fit(X_train_vec, y_train)

    preds = model.predict(X_test_vec)

    acc = accuracy_score(y_test, preds)
    f1_macro = f1_score(y_test, preds, average="macro")
    report = classification_report(y_test, preds)
    cm = confusion_matrix(y_test, preds, labels=model.classes_)

    full_report = []
    full_report.append("Smart Neighbors - Disturbance Severity ML Model")
    full_report.append("=" * 60)
    full_report.append(f"Model version: {MODEL_VERSION}")
    full_report.append(f"Training rows: {len(df)}")
    full_report.append(f"Train rows: {len(X_train)}")
    full_report.append(f"Test rows: {len(X_test)}")
    full_report.append(f"Accuracy: {acc:.4f}")
    full_report.append(f"Macro F1: {f1_macro:.4f}")
    full_report.append("")
    full_report.append("Classification Report:")
    full_report.append(report)
    full_report.append("")
    full_report.append("Confusion Matrix:")
    full_report.append(str(pd.DataFrame(cm, index=model.classes_, columns=model.classes_)))

    TRAINING_REPORT_PATH.write_text("\n".join(full_report), encoding="utf-8")

    joblib.dump(
        {
            "model": model,
            "vectorizer": vectorizer,
            "model_version": MODEL_VERSION,
            "classes": list(model.classes_),
        },
        JOBLIB_MODEL_PATH,
    )

    export_model_to_json(model, vectorizer, acc, f1_macro, len(df))

    print("Training completed successfully!")
    print(f"Accuracy: {acc:.4f}")
    print(f"Macro F1: {f1_macro:.4f}")
    print(f"Saved joblib model to: {JOBLIB_MODEL_PATH}")
    print(f"Saved JS JSON model to: {JSON_MODEL_PATH}")
    print(f"Saved report to: {TRAINING_REPORT_PATH}")
    print(f"Saved training data to: {TRAINING_DATA_PATH}")


def export_model_to_json(model, vectorizer, accuracy, f1_macro, train_rows):
    """
    מייצא את המודל לפורמט JSON כדי שאפשר יהיה להשתמש בו ישירות ב-React Native.
    אנחנו שומרים:
    - vocabulary
    - idf
    - coefficients
    - intercept
    - classes
    """

    API_DIR.mkdir(parents=True, exist_ok=True)

    # המרה מלאה לטיפוסים רגילים של Python כדי למנוע שגיאות JSON
    vocabulary = {
        str(term): int(index)
        for term, index in vectorizer.vocabulary_.items()
    }

    idf_values = [float(value) for value in vectorizer.idf_]

    coef_values = [
        [float(value) for value in row]
        for row in model.coef_
    ]

    intercept_values = [float(value) for value in model.intercept_]

    classes_values = [str(cls) for cls in model.classes_]

    payload = {
        "model_version": MODEL_VERSION,
        "model_type": "TFIDF_LogisticRegression",
        "classes": classes_values,
        "vocabulary": vocabulary,
        "idf": idf_values,
        "coef": coef_values,
        "intercept": intercept_values,
        "metadata": {
            "accuracy": float(accuracy),
            "macro_f1": float(f1_macro),
            "train_rows": int(train_rows),
            "text_features": "type + selected severity + location + description",
            "training_source": "synthetic data generated for Smart Neighbors project",
        },
    }

    JSON_MODEL_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    train_model()