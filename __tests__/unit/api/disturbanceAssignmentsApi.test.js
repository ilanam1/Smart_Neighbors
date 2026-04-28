import {
  getAssignmentsForReport,
  createAssignment,
  updateAssignmentStatus,
} from "../../../API/disturbanceAssignmentsApi";

import { mockSupabase } from "../../__mocks__/@supabase/supabase-js";

describe("disturbanceAssignmentsApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = { id: "user-1" };
  const mockProfile = { building_id: "building-1" };

  const mockCurrentUserAndProfile = () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const profileQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    };

    return profileQuery;
  };

  const mockSelectOrderQuery = (data, error = null) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockMaybeSingleQuery = (data, error = null) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockInsertQuery = (data, error = null) => ({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockUpdateQuery = (data, error = null) => ({
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  });

  test("getAssignmentsForReport returns assignments for current building", async () => {
    const profileQuery = mockCurrentUserAndProfile();

    const assignmentsQuery = mockSelectOrderQuery([
      {
        id: "a1",
        report_id: "r1",
        provider_id: "p1",
        status: "REQUESTED",
        building_id: "building-1",
      },
    ]);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "disturbance_assignments") return assignmentsQuery;
    });

    const result = await getAssignmentsForReport("r1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a1");
    expect(mockSupabase.from).toHaveBeenCalledWith("disturbance_assignments");
  });

  test("createAssignment creates assignment only after report and provider validation", async () => {
    const profileQuery = mockCurrentUserAndProfile();

    const reportQuery = mockMaybeSingleQuery({
      id: "r1",
      building_id: "building-1",
    });

    const providerQuery = mockMaybeSingleQuery({
      id: "p1",
      building_id: "building-1",
    });

    const createdAssignment = {
      id: "a1",
      report_id: "r1",
      provider_id: "p1",
      building_id: "building-1",
      status: "REQUESTED",
    };

    const insertQuery = mockInsertQuery(createdAssignment);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "disturbance_reports") return reportQuery;
      if (table === "service_providers") return providerQuery;
      if (table === "disturbance_assignments") return insertQuery;
    });

    const result = await createAssignment({
      reportId: "r1",
      providerId: "p1",
      note: "לטפל בהקדם",
    });

    expect(result).toEqual(createdAssignment);

    expect(insertQuery.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        report_id: "r1",
        provider_id: "p1",
        building_id: "building-1",
        status: "REQUESTED",
        created_by: "user-1",
        last_update_note: "לטפל בהקדם",
      }),
    ]);
  });

  test("createAssignment throws when report does not belong to building", async () => {
    const profileQuery = mockCurrentUserAndProfile();
    const reportQuery = mockMaybeSingleQuery(null);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "disturbance_reports") return reportQuery;
    });

    await expect(
      createAssignment({
        reportId: "r1",
        providerId: "p1",
        note: "",
      })
    ).rejects.toThrow("הדיווח לא נמצא או לא שייך לבניין שלך");
  });

  test("createAssignment throws when provider does not belong to building", async () => {
    const profileQuery = mockCurrentUserAndProfile();

    const reportQuery = mockMaybeSingleQuery({
      id: "r1",
      building_id: "building-1",
    });

    const providerQuery = mockMaybeSingleQuery(null);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "disturbance_reports") return reportQuery;
      if (table === "service_providers") return providerQuery;
    });

    await expect(
      createAssignment({
        reportId: "r1",
        providerId: "p1",
        note: "",
      })
    ).rejects.toThrow("הספק לא נמצא או לא שייך לבניין שלך");
  });

  test("updateAssignmentStatus updates status for current building", async () => {
    const profileQuery = mockCurrentUserAndProfile();

    const updatedAssignment = {
      id: "a1",
      status: "DONE",
      last_update_note: "טופל",
    };

    const updateQuery = mockUpdateQuery(updatedAssignment);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "disturbance_assignments") return updateQuery;
    });

    const result = await updateAssignmentStatus("a1", {
      status: "DONE",
      note: "טופל",
    });

    expect(result).toEqual(updatedAssignment);
    expect(updateQuery.update).toHaveBeenCalledWith({
      status: "DONE",
      last_update_note: "טופל",
    });
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "a1");
    expect(updateQuery.eq).toHaveBeenCalledWith("building_id", "building-1");
  });

  test("throws error when no logged in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    await expect(getAssignmentsForReport("r1")).rejects.toThrow(
      "אין משתמש מחובר"
    );
  });
});