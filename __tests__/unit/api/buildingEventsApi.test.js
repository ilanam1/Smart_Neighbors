import {
  createBuildingEvent,
  getBuildingEvents,
  deleteBuildingEvent,
  getCurrentUserCommitteeStatus,
} from "../../../API/buildingEventsApi";

import { mockSupabase } from "../../__mocks__/@supabase/supabase-js";

describe("buildingEventsApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = { id: "user-1" };

  const mockProfileQuery = (profile, error = null) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: profile, error }),
  });

  const mockInsertQuery = (data, error = null) => ({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockEventsQuery = (data, error = null) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockDeleteQuery = (error = null) => ({
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error }),
  });

  const mockAuth = () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });
  };

  test("creates building event when user is committee", async () => {
    mockAuth();

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: true,
    });

    const createdEvent = {
      id: "event-1",
      title: "ישיבת דיירים",
      building_id: "building-1",
    };

    const insertQuery = mockInsertQuery(createdEvent);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "building_events") return insertQuery;
    });

    const result = await createBuildingEvent({
      title: " ישיבת דיירים ",
      description: " עדכון חשוב ",
      location: " לובי ",
      startAt: "2026-05-10T18:00:00.000Z",
      endAt: "2026-05-10T20:00:00.000Z",
    });

    expect(result).toEqual(createdEvent);
    expect(insertQuery.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        building_id: "building-1",
        title: "ישיבת דיירים",
        description: "עדכון חשוב",
        location: "לובי",
        created_by: "user-1",
        event_type: "GENERAL",
        visibility: "ALL_RESIDENTS",
      }),
    ]);
  });

  test("blocks non committee user from creating event", async () => {
    mockAuth();

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: false,
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
    });

    await expect(
      createBuildingEvent({
        title: "אירוע",
        startAt: "2026-05-10T18:00:00.000Z",
      })
    ).rejects.toThrow("רק ועד הבית יכול ליצור אירועים");
  });

  test("gets building events for current user's building", async () => {
    mockAuth();

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: false,
    });

    const eventsQuery = mockEventsQuery([
      {
        id: "event-1",
        building_id: "building-1",
        title: "ישיבת דיירים",
      },
    ]);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "building_events") return eventsQuery;
    });

    const result = await getBuildingEvents();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("ישיבת דיירים");
    expect(eventsQuery.eq).toHaveBeenCalledWith("building_id", "building-1");
  });

  test("deletes event when user is committee", async () => {
    mockAuth();

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: true,
    });

    const deleteQuery = mockDeleteQuery();

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "building_events") return deleteQuery;
    });

    const result = await deleteBuildingEvent("event-1");

    expect(result).toBe(true);
    expect(deleteQuery.eq).toHaveBeenCalledWith("id", "event-1");
  });

  test("returns current user committee status", async () => {
    mockAuth();

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: true,
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
    });

    const result = await getCurrentUserCommitteeStatus();

    expect(result).toBe(true);
  });

  test("throws when no logged in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    await expect(getBuildingEvents()).rejects.toThrow("אין משתמש מחובר");
  });
});