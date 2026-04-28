import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import CommitteeWeeklyForecastScreen from "../../../screens/CommitteeWeeklyForecastScreen";
import { getWeeklyDisturbancePredictions } from "../../../API/weeklyPredictionsApi";

jest.mock("../../../API/weeklyPredictionsApi", () => ({
  getWeeklyDisturbancePredictions: jest.fn(),
}));

describe("CommitteeWeeklyForecastScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows empty state when there are no predictions", async () => {
    getWeeklyDisturbancePredictions.mockResolvedValueOnce([]);

    const { getByText } = render(<CommitteeWeeklyForecastScreen />);

    await waitFor(() => {
      expect(
        getByText("עדיין אין תחזיות זמינות. יש להריץ תחילה את מנגנון האימון והחיזוי.")
      ).toBeTruthy();
    });

    expect(getWeeklyDisturbancePredictions).toHaveBeenCalledTimes(1);
  });

  test("loads and renders weekly predictions", async () => {
    getWeeklyDisturbancePredictions.mockResolvedValueOnce([
      {
        id: "p1",
        disturbance_type: "NOISE",
        risk_level: "HIGH",
        probability: 0.82,
        target_week_start: "2026-05-04",
        target_week_end: "2026-05-10",
        explanation: "זוהתה תדירות גבוהה של דיווחים בחודש האחרון.",
        recommended_action: "סיכון גבוה: מומלץ לעקוב אחר דיווחי רעש.",
      },
    ]);

    const { getByText } = render(<CommitteeWeeklyForecastScreen />);

    await waitFor(() => {
      expect(getByText("תחזית שבועית למטרדים")).toBeTruthy();
      expect(getByText("שבוע חזוי: 2026-05-04 עד 2026-05-10")).toBeTruthy();
      expect(getByText("רעש")).toBeTruthy();
      expect(getByText("רמת סיכון: גבוה")).toBeTruthy();
      expect(getByText("הסתברות חזויה: 82%")).toBeTruthy();
      expect(getByText("הסבר")).toBeTruthy();
      expect(getByText("המלצה")).toBeTruthy();
    });
  });

  test("renders medium and low risk labels correctly", async () => {
    getWeeklyDisturbancePredictions.mockResolvedValueOnce([
      {
        id: "p1",
        disturbance_type: "CLEANLINESS",
        risk_level: "MEDIUM",
        probability: 0.45,
        target_week_start: "2026-05-04",
        target_week_end: "2026-05-10",
        explanation: "נרשמו מספר דיווחים לאחרונה.",
        recommended_action: "סיכון בינוני: מומלץ לבדוק תדירות ניקיון.",
      },
      {
        id: "p2",
        disturbance_type: "OTHER",
        risk_level: "LOW",
        probability: 0.12,
        target_week_start: "2026-05-04",
        target_week_end: "2026-05-10",
        explanation: "לא זוהו דפוסים חריגים.",
        recommended_action: "סיכון נמוך: אין צורך בפעולה מיידית.",
      },
    ]);

    const { getByText } = render(<CommitteeWeeklyForecastScreen />);

    await waitFor(() => {
      expect(getByText("לכלוך / אשפה")).toBeTruthy();
      expect(getByText("רמת סיכון: בינוני")).toBeTruthy();
      expect(getByText("אחר")).toBeTruthy();
      expect(getByText("רמת סיכון: נמוך")).toBeTruthy();
    });
  });

  test("shows error message when API fails", async () => {
    getWeeklyDisturbancePredictions.mockRejectedValueOnce(
      new Error("רק ועד הבית יכול לצפות בתחזית השבועית")
    );

    const { getByText } = render(<CommitteeWeeklyForecastScreen />);

    await waitFor(() => {
      expect(
        getByText("שגיאה: רק ועד הבית יכול לצפות בתחזית השבועית")
      ).toBeTruthy();
    });
  });
});