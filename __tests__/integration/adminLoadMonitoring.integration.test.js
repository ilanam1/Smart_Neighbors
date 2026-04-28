import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import AdminLoadMonitoringScreen from "../../screens/AdminLoadMonitoringScreen";
import { mockSupabase } from "../__mocks__/@supabase/supabase-js";

describe("admin load monitoring integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const adminUser = { id: "admin-1" };

  const navigationMock = {
    goBack: jest.fn(),
  };

  const makeSelectOnlyQuery = (data, error = null) => ({
    select: jest.fn().mockResolvedValue({ data, error }),
  });

  const makeDateQuery = (data, error = null) => ({
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  });

  test("admin sees calculated monitoring data from Supabase mock", async () => {
    const now = new Date().toISOString();

    const requests = Array.from({ length: 8 }, (_, i) => ({
      id: `req-${i}`,
      auth_user_id: "user-1",
      building_id: "b1",
      title: "בקשה",
      category: "GENERAL",
      urgency: "HIGH",
      status: "OPEN",
      created_at: now,
      closed_at: null,
    }));

    const disturbances = Array.from({ length: 3 }, (_, i) => ({
      id: `dist-${i}`,
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

    const { getByText } = render(
      <AdminLoadMonitoringScreen
        navigation={navigationMock}
        route={{ params: { adminUser } }}
      />
    );

    await waitFor(() => {
      expect(getByText("ניטור עומסים והתנהגות חריגה")).toBeTruthy();
      expect(getByText("Building A")).toBeTruthy();
      expect(getByText("עומס חריג")).toBeTruthy();
      expect(getByText("Test User")).toBeTruthy();
      expect(getByText("סה״כ פעולות: 11")).toBeTruthy();
      expect(getByText("עומס בקשות בבניין Building A")).toBeTruthy();
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("requests");
    expect(mockSupabase.from).toHaveBeenCalledWith("disturbance_reports");
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSupabase.from).toHaveBeenCalledWith("buildings");
  });

  test("admin sees clean empty state when there is no suspicious activity", async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === "requests") return makeDateQuery([]);
      if (table === "disturbance_reports") return makeDateQuery([]);
      if (table === "profiles") return makeSelectOnlyQuery([]);
      if (table === "buildings") {
        return makeSelectOnlyQuery([
          {
            id: "b1",
            name: "Building A",
            city: "Beer Sheva",
            address: "Main 1",
          },
        ]);
      }
    });

    const { getByText } = render(
      <AdminLoadMonitoringScreen
        navigation={navigationMock}
        route={{ params: { adminUser } }}
      />
    );

    await waitFor(() => {
      expect(getByText("אין כרגע התראות עומס חריגות.")).toBeTruthy();
      expect(getByText("לא זוהו משתמשים חריגים כרגע.")).toBeTruthy();
      expect(getByText("תקין")).toBeTruthy();
    });
  });
});