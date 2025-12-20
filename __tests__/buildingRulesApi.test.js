import { getBuildingRules, saveBuildingRules } from "../buildingRulesApi";

// ---- mock supabase ----
const mockFrom = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockMaybeSingle = jest.fn();
const mockUpsert = jest.fn();
const mockSelect = jest.fn();

jest.mock("../DataBase/supabase", () => ({
  getSupabase: () => ({
    from: (...args) => mockFrom(...args),
  }),
}));

describe("buildingRulesApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // from("building_rules") מחזיר אובייקט עם select / upsert
    mockFrom.mockReturnValue({
      select: () => ({
        order: mockOrder,
      }),
      upsert: mockUpsert,
    });

    mockOrder.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle });

    mockUpsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ maybeSingle: mockMaybeSingle });
  });

  test("getBuildingRules מחזיר data כשאין שגיאה", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 1, content: "rules" },
      error: null,
    });

    const res = await getBuildingRules();

    expect(res).toEqual({ id: 1, content: "rules" });
    expect(mockFrom).toHaveBeenCalledWith("building_rules");
  });

  test("saveBuildingRules עושה upsert עם id=1 ומחזיר data", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 1, content: "new rules" },
      error: null,
    });

    const res = await saveBuildingRules({ content: "new rules", userId: "u1" });

    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 1, content: "new rules", updated_by: "u1" },
      { onConflict: "id" }
    );

    expect(res).toEqual({ id: 1, content: "new rules" });
  });

  test("saveBuildingRules זורק שגיאה אם supabase מחזיר error", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: new Error("db error"),
    });

    await expect(saveBuildingRules({ content: "x", userId: "u1" })).rejects.toThrow(
      "db error"
    );
  });
});
