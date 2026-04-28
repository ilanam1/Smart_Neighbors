import { getWeeklyDisturbancePredictions } from "../../../API/weeklyPredictionsApi";
import { mockSupabase } from "../../__mocks__/@supabase/supabase-js";

describe("weeklyPredictionsApi", () => {
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

  test("returns only predictions from the latest week for committee member", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: true,
    });

    const predictionsQuery = mockPredictionsQuery([
      {
        id: "p1",
        building_id: "building-1",
        disturbance_type: "NOISE",
        target_week_start: "2026-05-04",
        probability: 0.8,
      },
      {
        id: "p2",
        building_id: "building-1",
        disturbance_type: "SAFETY",
        target_week_start: "2026-05-04",
        probability: 0.7,
      },
      {
        id: "old",
        building_id: "building-1",
        disturbance_type: "OTHER",
        target_week_start: "2026-04-27",
        probability: 0.9,
      },
    ]);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "weekly_disturbance_predictions") return predictionsQuery;
    });

    const result = await getWeeklyDisturbancePredictions();

    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSupabase.from).toHaveBeenCalledWith("weekly_disturbance_predictions");

    expect(result).toHaveLength(2);
    expect(result.every((item) => item.target_week_start === "2026-05-04")).toBe(true);
  });

  test("returns empty array when no predictions exist", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: true,
    });

    const predictionsQuery = mockPredictionsQuery([]);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "weekly_disturbance_predictions") return predictionsQuery;
    });

    const result = await getWeeklyDisturbancePredictions();

    expect(result).toEqual([]);
  });

  test("throws error when user is not committee member", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: false,
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
    });

    await expect(getWeeklyDisturbancePredictions()).rejects.toThrow(
      "רק ועד הבית יכול לצפות בתחזית השבועית"
    );
  });

  test("throws error when no logged in user exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    await expect(getWeeklyDisturbancePredictions()).rejects.toThrow(
      "אין משתמש מחובר"
    );
  });

  test("throws error when profile has no building", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery({
      building_id: null,
      is_house_committee: true,
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
    });

    await expect(getWeeklyDisturbancePredictions()).rejects.toThrow(
      "למשתמש המחובר עדיין לא משויך בניין"
    );
  });

  test("throws readable error when predictions query fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: true,
    });

    const predictionsQuery = mockPredictionsQuery(null, new Error("DB error"));

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "weekly_disturbance_predictions") return predictionsQuery;
    });

    await expect(getWeeklyDisturbancePredictions()).rejects.toThrow(
      "שגיאה בשליפת התחזית השבועית"
    );
  });
});