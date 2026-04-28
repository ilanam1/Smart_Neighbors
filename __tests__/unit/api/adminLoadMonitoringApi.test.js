import {
  getAdminLoadMonitoringData,
  flagUserForReview,
  unflagUser,
  blockUser,
  unblockUser,
} from "../../../API/adminLoadMonitoringApi";

import { mockSupabase } from "../../__mocks__/@supabase/supabase-js";

describe("adminLoadMonitoringApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const adminUser = { id: "admin-1" };

  const makeSelectOnlyQuery = (data, error = null) => ({
    select: jest.fn().mockResolvedValue({ data, error }),
  });

  const makeDateQuery = (data, error = null) => ({
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  });

  const makeUpdateQuery = (data, error = null) => ({
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  });

  test("throws error when admin user is missing", async () => {
    await expect(getAdminLoadMonitoringData(null)).rejects.toThrow(
      "אין אדמין מחובר"
    );
  });

  test("calculates KPIs, overloaded buildings, suspicious users and alerts", async () => {
    const now = new Date().toISOString();

    const requests = Array.from({ length: 8 }, (_, i) => ({
      id: `r${i}`,
      auth_user_id: "user-1",
      building_id: "b1",
      title: "בקשה",
      category: "GENERAL",
      urgency: "HIGH",
      status: i < 5 ? "OPEN" : "CLOSED",
      created_at: now,
      closed_at: null,
    }));

    const disturbances = Array.from({ length: 3 }, (_, i) => ({
      id: `d${i}`,
      auth_user_id: "user-1",
      building_id: "b1",
      type: "NOISE",
      severity: "HIGH",
      status: "OPEN",
      created_at: now,
      occurred_at: now,
    }));

    const profiles = [
      {
        auth_uid: "user-1",
        first_name: "Test",
        last_name: "User",
        email: "test@example.com",
        building_id: "b1",
        is_flagged: false,
        is_blocked: false,
      },
    ];

    const buildings = [
      {
        id: "b1",
        name: "Building A",
        city: "Beer Sheva",
        address: "Main 1",
      },
    ];

    mockSupabase.from.mockImplementation((table) => {
      if (table === "requests") return makeDateQuery(requests);
      if (table === "disturbance_reports") return makeDateQuery(disturbances);
      if (table === "profiles") return makeSelectOnlyQuery(profiles);
      if (table === "buildings") return makeSelectOnlyQuery(buildings);
    });

    const result = await getAdminLoadMonitoringData(adminUser, 7);

    expect(mockSupabase.from).toHaveBeenCalledWith("requests");
    expect(mockSupabase.from).toHaveBeenCalledWith("disturbance_reports");
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSupabase.from).toHaveBeenCalledWith("buildings");

    expect(result.kpis.openRequests).toBe(5);
    expect(result.kpis.openDisturbances).toBe(3);
    expect(result.kpis.requests24h).toBe(8);
    expect(result.kpis.disturbances24h).toBe(3);
    expect(result.kpis.overloadedBuildings).toBe(1);
    expect(result.kpis.suspiciousUsers).toBe(1);

    expect(result.buildingLoad[0].buildingName).toBe("Building A");
    expect(result.buildingLoad[0].isOverloaded).toBe(true);

    expect(result.suspiciousUsers[0].auth_uid).toBe("user-1");
    expect(result.suspiciousUsers[0].total24h).toBe(11);

    expect(result.alerts.length).toBeGreaterThan(0);
  });

  test("returns empty monitoring data when there is no activity", async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === "requests") return makeDateQuery([]);
      if (table === "disturbance_reports") return makeDateQuery([]);
      if (table === "profiles") return makeSelectOnlyQuery([]);
      if (table === "buildings") {
        return makeSelectOnlyQuery([
          { id: "b1", name: "Building A", city: "Beer Sheva", address: "Main 1" },
        ]);
      }
    });

    const result = await getAdminLoadMonitoringData(adminUser, 7);

    expect(result.kpis.openRequests).toBe(0);
    expect(result.kpis.openDisturbances).toBe(0);
    expect(result.kpis.suspiciousUsers).toBe(0);
    expect(result.kpis.overloadedBuildings).toBe(0);
    expect(result.alerts).toEqual([]);
    expect(result.buildingLoad[0].isOverloaded).toBe(false);
  });

  test("throws readable error when requests query fails", async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === "requests") return makeDateQuery(null, new Error("DB error"));
      if (table === "disturbance_reports") return makeDateQuery([]);
      if (table === "profiles") return makeSelectOnlyQuery([]);
      if (table === "buildings") return makeSelectOnlyQuery([]);
    });

    await expect(getAdminLoadMonitoringData(adminUser, 7)).rejects.toThrow(
      "שגיאה בשליפת בקשות לאדמין"
    );
  });

  test("flags user for review", async () => {
    const updatedProfile = {
      auth_uid: "user-1",
      is_flagged: true,
      flagged_reason: "פעילות חריגה",
    };

    const query = makeUpdateQuery(updatedProfile);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return query;
    });

    const result = await flagUserForReview(adminUser, "user-1", "פעילות חריגה");

    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_flagged: true,
        flagged_reason: "פעילות חריגה",
        flagged_by: "admin-1",
      })
    );
    expect(query.eq).toHaveBeenCalledWith("auth_uid", "user-1");
    expect(result).toEqual(updatedProfile);
  });

  test("unflags user", async () => {
    const query = makeUpdateQuery({ auth_uid: "user-1", is_flagged: false });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return query;
    });

    await unflagUser(adminUser, "user-1");

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_flagged: false,
        flagged_reason: null,
        flagged_at: null,
        flagged_by: null,
      })
    );
  });

  test("blocks user", async () => {
    const query = makeUpdateQuery({ auth_uid: "user-1", is_blocked: true });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return query;
    });

    await blockUser(adminUser, "user-1", "ספאם");

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_blocked: true,
        blocked_reason: "ספאם",
        blocked_by: "admin-1",
      })
    );
  });

  test("unblocks user", async () => {
    const query = makeUpdateQuery({ auth_uid: "user-1", is_blocked: false });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return query;
    });

    await unblockUser(adminUser, "user-1");

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_blocked: false,
        blocked_reason: null,
        blocked_at: null,
        blocked_by: null,
      })
    );
  });
});