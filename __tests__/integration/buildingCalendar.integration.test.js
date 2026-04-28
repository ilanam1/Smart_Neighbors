import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

import BuildingCalendarScreen from "../../screens/BuildingCalendarScreen";

import { mockSupabase } from "../__mocks__/@supabase/supabase-js";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock("react-native-calendars", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");

  return {
    Calendar: ({ onDayPress }) => (
      <TouchableOpacity onPress={() => onDayPress({ dateString: "2026-05-10" })}>
        <Text>Mock Calendar</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock("../../API/inspectionsApi", () => ({
  getBuildingInspections: jest.fn().mockResolvedValue([
    {
      id: "inspection-1",
      due_date: "2026-05-10T10:00:00.000Z",
      effective_status: "PENDING",
      status: "PENDING",
      inspection_templates: {
        name: "בדיקת מעלית",
        description: "בדיקה חודשית",
        priority: "HIGH",
      },
      service_employees: {
        full_name: "Moshe Worker",
      },
    },
  ]),
}));

describe("building calendar integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProfileQuery = (profile, error = null) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: profile, error }),
  });

  const mockEventsQuery = (data, error = null) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockInsertQuery = (data, error = null) => ({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  });

  test("committee user sees events and inspections from API layer", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "committee-user-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: true,
    });

    const eventsQuery = mockEventsQuery([
      {
        id: "event-1",
        title: "ישיבת דיירים",
        description: "דיון תחזוקה",
        location: "לובי",
        start_at: "2026-05-10T18:00:00.000Z",
        end_at: "2026-05-10T20:00:00.000Z",
        event_type: "GENERAL",
      },
    ]);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "building_events") return eventsQuery;
    });

    const { getByText } = render(<BuildingCalendarScreen />);

    await waitFor(() => {
      expect(getByText("לוח אירועי הבניין")).toBeTruthy();
      expect(getByText("אירוע חדש")).toBeTruthy();
    });

    fireEvent.press(getByText("Mock Calendar"));

    await waitFor(() => {
      expect(getByText("ישיבת דיירים")).toBeTruthy();
      expect(getByText("ביקורת: בדיקת מעלית")).toBeTruthy();
    });
  });

  test("committee user creates event through UI and API layer", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "committee-user-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery({
      building_id: "building-1",
      is_house_committee: true,
    });

    const emptyEventsQuery = mockEventsQuery([]);

    const insertQuery = mockInsertQuery({
      id: "event-new",
      title: "ישיבת דיירים",
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "building_events") {
        if (mockSupabase.from.mock.calls.filter((c) => c[0] === "building_events").length === 2) {
          return insertQuery;
        }
        return emptyEventsQuery;
      }
    });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = render(<BuildingCalendarScreen />);

    await waitFor(() => {
      expect(getByText("אירוע חדש")).toBeTruthy();
    });

    fireEvent.press(getByText("אירוע חדש"));

    fireEvent.changeText(getByPlaceholderText("למשל: ישיבת דיירים"), "ישיבת דיירים");
    fireEvent.changeText(getByPlaceholderText("2026-05-10T18:00"), "2026-05-10T18:00");

    fireEvent.press(getByText("שמור"));

    await waitFor(() => {
      expect(insertQuery.insert).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith("הצלחה", "האירוע נוסף ללוח האירועים");
    });

    alertSpy.mockRestore();
  });
});