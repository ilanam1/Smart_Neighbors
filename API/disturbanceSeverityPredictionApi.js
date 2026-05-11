// API/disturbanceSeverityPredictionApi.js
// שימוש במודל ML מאומן שיוצא מתוך Python לקובץ JSON
// המודל מבוסס TF-IDF + Logistic Regression

import mlModel from "./disturbance_severity_model.json";

const MODEL_FALLBACK_VERSION = "ml-severity-logreg-v1.0";

const SEVERITY_SCORE = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

const TYPE_LABELS = {
  NOISE: "רעש",
  CLEANLINESS: "ניקיון / לכלוך",
  SAFETY: "בטיחות",
  OTHER: "אחר",
};

const SEVERITY_LABELS = {
  LOW: "נמוכה",
  MEDIUM: "בינונית",
  HIGH: "גבוהה",
};

function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeWithBigrams(text = "") {
  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  const words = normalized.split(" ").filter(Boolean);
  const tokens = [...words];

  for (let i = 0; i < words.length - 1; i += 1) {
    tokens.push(`${words[i]} ${words[i + 1]}`);
  }

  return tokens;
}

function buildModelText({ type, selectedSeverity, description, location }) {
  return [
    `type_${type || "OTHER"}`,
    `selected_${selectedSeverity || "MEDIUM"}`,
    `location_${location || ""}`,
    description || "",
  ].join(" ");
}

function softmax(scores) {
  const maxScore = Math.max(...scores);
  const expScores = scores.map((score) => Math.exp(score - maxScore));
  const sumExp = expScores.reduce((sum, value) => sum + value, 0);

  return expScores.map((value) => value / sumExp);
}

function vectorizeText(text) {
  const tokens = tokenizeWithBigrams(text);
  const vocabulary = mlModel.vocabulary || {};
  const idf = mlModel.idf || [];

  const counts = {};
  let totalCount = 0;

  tokens.forEach((token) => {
    const index = vocabulary[token];

    if (index !== undefined && index !== null) {
      counts[index] = (counts[index] || 0) + 1;
      totalCount += 1;
    }
  });

  const vector = {};

  Object.keys(counts).forEach((indexAsString) => {
    const index = Number(indexAsString);
    const tf = counts[index] / Math.max(totalCount, 1);
    const idfValue = idf[index] || 1;

    // קירוב של sublinear_tf=True מהאימון בפייתון
    vector[index] = (1 + Math.log(1 + counts[index])) * idfValue * tf;
  });

  // נרמול L2 כמו TF-IDF
  const norm = Math.sqrt(
    Object.values(vector).reduce((sum, value) => sum + value * value, 0)
  );

  if (norm > 0) {
    Object.keys(vector).forEach((index) => {
      vector[index] = vector[index] / norm;
    });
  }

  return vector;
}

function predictWithModel(input) {
  const classes = mlModel.classes || ["LOW", "MEDIUM", "HIGH"];
  const coef = mlModel.coef || [];
  const intercept = mlModel.intercept || [];

  const modelText = buildModelText(input);
  const vector = vectorizeText(modelText);

  const scores = classes.map((_, classIndex) => {
    let score = intercept[classIndex] || 0;
    const classCoef = coef[classIndex] || [];

    Object.entries(vector).forEach(([indexAsString, value]) => {
      const index = Number(indexAsString);
      score += (classCoef[index] || 0) * value;
    });

    return score;
  });

  const probabilities = softmax(scores);
  let bestIndex = 0;

  probabilities.forEach((probability, index) => {
    if (probability > probabilities[bestIndex]) {
      bestIndex = index;
    }
  });

  return {
    predictedSeverity: classes[bestIndex],
    confidence: probabilities[bestIndex],
    probabilities: classes.reduce((acc, className, index) => {
      acc[className] = Number(probabilities[index].toFixed(4));
      return acc;
    }, {}),
  };
}

function buildReason({
  type,
  selectedSeverity,
  predictedSeverity,
  confidence,
  probabilities,
}) {
  const selectedScore = SEVERITY_SCORE[selectedSeverity] || 2;
  const predictedScore = SEVERITY_SCORE[predictedSeverity] || 2;

  let recommendationSentence = "המודל מזהה התאמה בין חומרת הדייר לבין חומרת התקלה המשוערת.";

  if (predictedScore > selectedScore) {
    recommendationSentence = "המודל ממליץ להעלות את חומרת התקלה ביחס לבחירת הדייר.";
  } else if (predictedScore < selectedScore) {
    recommendationSentence = "המודל מעריך שניתן להוריד את חומרת התקלה ביחס לבחירת הדייר.";
  }

  const confidencePercent = Math.round(confidence * 100);

  return [
    `החיזוי בוצע באמצעות מודל ML מסוג TF-IDF + Logistic Regression.`,
    `המודל ניתח את סוג התקלה (${TYPE_LABELS[type] || type}), תיאור הדיווח, מיקום וחומרה שנבחרה.`,
    recommendationSentence,
    `רמת הביטחון של המודל: ${confidencePercent}%.`,
    `התפלגות הסתברויות: נמוכה ${Math.round((probabilities.LOW || 0) * 100)}%, בינונית ${Math.round((probabilities.MEDIUM || 0) * 100)}%, גבוהה ${Math.round((probabilities.HIGH || 0) * 100)}%.`,
  ].join(" ");
}

export function predictDisturbanceSeverity({
  type,
  selectedSeverity,
  description,
  location,
}) {
  const result = predictWithModel({
    type,
    selectedSeverity,
    description,
    location,
  });

  const selectedScore = SEVERITY_SCORE[selectedSeverity] || 2;
  const predictedScore = SEVERITY_SCORE[result.predictedSeverity] || 2;

  let recommendationType = "MATCH";

  if (predictedScore > selectedScore) {
    recommendationType = "RAISE";
  } else if (predictedScore < selectedScore) {
    recommendationType = "LOWER";
  }

  return {
    predicted_severity: result.predictedSeverity,
    severity_confidence: Number(result.confidence.toFixed(2)),
    severity_recommendation_reason: buildReason({
      type,
      selectedSeverity,
      predictedSeverity: result.predictedSeverity,
      confidence: result.confidence,
      probabilities: result.probabilities,
    }),
    severity_model_version:
      mlModel.model_version || MODEL_FALLBACK_VERSION,
    severity_recommendation_type: recommendationType,
    severity_probabilities: result.probabilities,

    type_label: TYPE_LABELS[type] || type,
    selected_severity_label:
      SEVERITY_LABELS[selectedSeverity] || selectedSeverity,
    predicted_severity_label:
      SEVERITY_LABELS[result.predictedSeverity] || result.predictedSeverity,
  };
}