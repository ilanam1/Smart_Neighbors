import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { Alert, Platform } from "react-native";

import BuildingCalendarScreen from "../../../screens/BuildingCalendarScreen";

import { getBuildingInspections } from "../../../API/inspectionsApi";
import {
  createBuildingEvent,
  getBuildingEvents,
  getCurrentUserCommitteeStatus,
} from "../../../API/buildingEventsApi";

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

jest.mock("../../../API/inspectionsApi", () => ({
  getBuildingInspections: jest.fn(),
}));

jest.mock("../../../API/buildingEventsApi", () => ({
  createBuildingEvent: jest.fn(),
  getBuildingEvents: jest.fn(),
  getCurrentUserCommitteeStatus: jest.fn(),
}));

let mockTimeCalls = 0;

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { TouchableOpacity, Text } = require("react-native");
  return function MockDateTimePicker({ value, mode, onChange }) {
    return (
      <TouchableOpacity
        testID={`datetimepicker-${mode}`}
        onPress={() => {
          const dummyDate = new Date(value);
          if (mode === "date") {
            dummyDate.setFullYear(2026, 4, 10); // 2026-05-10
          } else if (mode === "time") {
            mockTimeCalls++;
            if (mockTimeCalls === 1) {
              dummyDate.setHours(18, 0, 0, 0); // 18:00
            } else {
              dummyDate.setHours(20, 0, 0, 0); // 20:00
            }
          }
          onChange({ type: "set" }, dummyDate);
        }}
      >
        <Text>MockDateTimePicker-{mode}</Text>
      </TouchableOpacity>
    );
  };
});

describe("BuildingCalendarScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTimeCalls = 0;
    Platform.OS = "android";
  });

  const event = {
    id: "event-1",
    title: "ישיבת דיירים",
    description: "דיון על תחזוקה",
    location: "לובי",
    start_at: "2026-05-10T18:00:00.000Z",
    end_at: "2026-05-10T20:00:00.000Z",
    event_type: "GENERAL",
  };

  const inspection = {
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
  };

  test("loads and renders calendar with event and inspection", async () => {
    getBuildingInspections.mockResolvedValueOnce([inspection]);
    getBuildingEvents.mockResolvedValueOnce([event]);
    getCurrentUserCommitteeStatus.mockResolvedValueOnce(true);

    const { getByText } = render(<BuildingCalendarScreen />);

    await waitFor(() => {
      expect(getByText("לוח אירועי הבניין")).toBeTruthy();
      expect(getByText("אירוע חדש")).toBeTruthy();
      expect(getByText("Mock Calendar")).toBeTruthy();
    });

    fireEvent.press(getByText("Mock Calendar"));

    await waitFor(() => {
      expect(getByText("ישיבת דיירים")).toBeTruthy();
      expect(getByText("ביקורת: בדיקת מעלית")).toBeTruthy();
      expect(getByText("מיקום: לובי")).toBeTruthy();
      expect(getByText("אחראי: Moshe Worker")).toBeTruthy();
    });
  });

  test("does not show create button for non committee user", async () => {
    getBuildingInspections.mockResolvedValueOnce([]);
    getBuildingEvents.mockResolvedValueOnce([]);
    getCurrentUserCommitteeStatus.mockResolvedValueOnce(false);

    const { queryByText } = render(<BuildingCalendarScreen />);

    await waitFor(() => {
      expect(queryByText("אירוע חדש")).toBeNull();
    });
  });

  test("opens create event modal for committee user", async () => {
    getBuildingInspections.mockResolvedValueOnce([]);
    getBuildingEvents.mockResolvedValueOnce([]);
    getCurrentUserCommitteeStatus.mockResolvedValueOnce(true);

    const { getByText } = render(<BuildingCalendarScreen />);

    await waitFor(() => {
      expect(getByText("אירוע חדש")).toBeTruthy();
    });

    fireEvent.press(getByText("אירוע חדש"));

    await waitFor(() => {
      expect(getByText("הוספת אירוע חדש")).toBeTruthy();
      expect(getByText("כותרת")).toBeTruthy();
      expect(getByText("תחילת אירוע")).toBeTruthy();
    });
  });

  test("requires title before creating event", async () => {
    getBuildingInspections.mockResolvedValueOnce([]);
    getBuildingEvents.mockResolvedValueOnce([]);
    getCurrentUserCommitteeStatus.mockResolvedValueOnce(true);

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText } = render(<BuildingCalendarScreen />);

    await waitFor(() => {
      expect(getByText("אירוע חדש")).toBeTruthy();
    });

    fireEvent.press(getByText("אירוע חדש"));
    fireEvent.press(getByText("שמור"));

    expect(alertSpy).toHaveBeenCalledWith("שגיאה", "יש להזין כותרת לאירוע");

    alertSpy.mockRestore();
  });

  test("creates event and reloads calendar", async () => {
    getBuildingInspections
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    getBuildingEvents
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([event]);

    getCurrentUserCommitteeStatus
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    createBuildingEvent.mockResolvedValueOnce({ id: "event-1" });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText, getByPlaceholderText, getByTestId } = render(<BuildingCalendarScreen />);

    await waitFor(() => {
      expect(getByText("אירוע חדש")).toBeTruthy();
    });

    fireEvent.press(getByText("אירוע חדש"));

    fireEvent.changeText(getByPlaceholderText("למשל: ישיבת דיירים"), "ישיבת דיירים");
    fireEvent.changeText(getByPlaceholderText("פרטים על האירוע..."), "דיון על תחזוקה");
    fireEvent.changeText(getByPlaceholderText("לובי / חדר אשפה / גג / חניה"), "לובי");

    // Click start date, trigger mock picker
    fireEvent.press(getByTestId("btn-start-date"));
    fireEvent.press(getByTestId("datetimepicker-date"));

    // Click start time, trigger mock picker
    fireEvent.press(getByTestId("btn-start-time"));
    fireEvent.press(getByTestId("datetimepicker-time"));

    // Click end date, trigger mock picker
    fireEvent.press(getByTestId("btn-end-date"));
    fireEvent.press(getByTestId("datetimepicker-date"));

    // Click end time, trigger mock picker
    fireEvent.press(getByTestId("btn-end-time"));
    fireEvent.press(getByTestId("datetimepicker-time"));

    fireEvent.press(getByText("שמור"));

    await waitFor(() => {
      expect(createBuildingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "ישיבת דיירים",
          description: "דיון על תחזוקה",
          location: "לובי",
          eventType: "GENERAL",
        })
      );

      expect(alertSpy).toHaveBeenCalledWith("הצלחה", "האירוע נוסף ללוח האירועים");
    });

    alertSpy.mockRestore();
  });

  test("shows alert when loading calendar fails", async () => {
    getBuildingInspections.mockRejectedValueOnce(new Error("Network error"));
    getBuildingEvents.mockResolvedValueOnce([]);
    getCurrentUserCommitteeStatus.mockResolvedValueOnce(false);

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    render(<BuildingCalendarScreen />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("שגיאה", "Network error");
    });

    alertSpy.mockRestore();
  });
});