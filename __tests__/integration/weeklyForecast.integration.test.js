import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import CommitteeWeeklyForecastScreen from "../../screens/CommitteeWeeklyForecastScreen";
import { mockSupabase } from "../__mocks__/@supabase/supabase-js";

describe("weekly forecast integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProfileQuery = (profile, error = null) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: profile,
      error,
    }),
  });

  const mockPredictionsQuery = (data, error = null) => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn(),
    };

    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({
        data,
        error,
      });

    return query;
  };

  test("committee user can load forecast from Supabase and see it on screen", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "committee-user-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: true,
    });

    const predictionsQuery = mockPredictionsQuery([
      {
        id: "pred-1",
        building_id: "building-1",
        disturbance_type: "SAFETY",
        risk_level: "HIGH",
        probability: 0.91,
        target_week_start: "2026-05-04",
        target_week_end: "2026-05-10",
        explanation: "לפחות חלק מהדיווחים האחרונים היו בחומרה גבוהה.",
        recommended_action: "סיכון גבוה: מומלץ לבצע בדיקה יזומה.",
      },
    ]);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "weekly_disturbance_predictions") return predictionsQuery;
    });

    const { getByText } = render(<CommitteeWeeklyForecastScreen />);

    await waitFor(() => {
      expect(getByText("תחזית שבועית למטרדים")).toBeTruthy();
      expect(getByText("בטיחות / ונדליזם")).toBeTruthy();
      expect(getByText("רמת סיכון: גבוה")).toBeTruthy();
      expect(getByText("הסתברות חזויה: 91%")).toBeTruthy();
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSupabase.from).toHaveBeenCalledWith("weekly_disturbance_predictions");
  });

  test("non committee user is blocked from seeing weekly forecast", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "regular-user-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: false,
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
    });

    const { getByText } = render(<CommitteeWeeklyForecastScreen />);

    await waitFor(() => {
      expect(
        getByText("שגיאה: רק ועד הבית יכול לצפות בתחזית השבועית")
      ).toBeTruthy();
    });
  });
});