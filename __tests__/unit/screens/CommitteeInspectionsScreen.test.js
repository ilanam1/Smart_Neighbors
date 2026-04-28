import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

import CommitteeInspectionsScreen from "../../../screens/CommitteeInspectionsScreen";

import { listProviders } from "../../../API/serviceProvidersApi";
import {
  listInspectionTemplates,
  createBuildingInspection,
  getBuildingInspections,
} from "../../../API/inspectionsApi";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useIsFocused: () => true,
}));

jest.mock("../../../API/serviceProvidersApi", () => ({
  listProviders: jest.fn(),
}));

jest.mock("../../../API/inspectionsApi", () => ({
  listInspectionTemplates: jest.fn(),
  createBuildingInspection: jest.fn(),
  getBuildingInspections: jest.fn(),
}));

describe("CommitteeInspectionsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const template = {
    id: "template-1",
    name: "בדיקת מעלית",
    description: "בדיקה חודשית",
    priority: "HIGH",
  };

  const employee = {
    id: "emp-1",
    name: "Moshe Worker",
  };

  const inspection = {
    id: "inspection-1",
    due_date: "2026-05-10T10:00:00.000Z",
    status: "PENDING",
    effective_status: "PENDING",
    notes: "",
    inspection_templates: template,
    service_employees: {
      id: "emp-1",
      full_name: "Moshe Worker",
      phone: "0500000000",
    },
  };

  test("loads and renders inspections", async () => {
    getBuildingInspections.mockResolvedValueOnce([inspection]);
    listInspectionTemplates.mockResolvedValueOnce([template]);
    listProviders.mockResolvedValueOnce([employee]);

    const { getByText } = render(<CommitteeInspectionsScreen />);

    await waitFor(() => {
      expect(getByText("ביקורות תקופתיות")).toBeTruthy();
      expect(getByText("בדיקת מעלית")).toBeTruthy();
      expect(getByText("תיאור: בדיקה חודשית")).toBeTruthy();
      expect(getByText("עדיפות: גבוהה")).toBeTruthy();
      expect(getByText("עובד אחראי: Moshe Worker")).toBeTruthy();
      expect(getByText("+ ביקורת חדשה")).toBeTruthy();
    });
  });

  test("renders empty state", async () => {
    getBuildingInspections.mockResolvedValueOnce([]);
    listInspectionTemplates.mockResolvedValueOnce([]);
    listProviders.mockResolvedValueOnce([]);

    const { getByText } = render(<CommitteeInspectionsScreen />);

    await waitFor(() => {
      expect(getByText("אין ביקורות תקופתיות עדיין.")).toBeTruthy();
    });
  });

  test("navigates to building calendar", async () => {
    getBuildingInspections.mockResolvedValueOnce([]);
    listInspectionTemplates.mockResolvedValueOnce([]);
    listProviders.mockResolvedValueOnce([]);

    const { getByText } = render(<CommitteeInspectionsScreen />);

    await waitFor(() => {
      expect(getByText("לוח אירועים")).toBeTruthy();
    });

    fireEvent.press(getByText("לוח אירועים"));

    expect(mockNavigate).toHaveBeenCalledWith("BuildingCalendar");
  });

  test("opens create modal with templates and employees", async () => {
    getBuildingInspections.mockResolvedValueOnce([]);
    listInspectionTemplates.mockResolvedValueOnce([template]);
    listProviders.mockResolvedValueOnce([employee]);

    const { getByText } = render(<CommitteeInspectionsScreen />);

    await waitFor(() => {
      expect(getByText("+ ביקורת חדשה")).toBeTruthy();
    });

    fireEvent.press(getByText("+ ביקורת חדשה"));

    await waitFor(() => {
      expect(getByText("הוספת ביקורת תקופתית")).toBeTruthy();
      expect(getByText("בדיקת מעלית")).toBeTruthy();
      expect(getByText("Moshe Worker")).toBeTruthy();
    });
  });

  test("creates inspection and reloads list", async () => {
    getBuildingInspections
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([inspection]);

    listInspectionTemplates
      .mockResolvedValueOnce([template])
      .mockResolvedValueOnce([template]);

    listProviders
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([employee]);

    createBuildingInspection.mockResolvedValueOnce({ id: "inspection-1" });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = render(<CommitteeInspectionsScreen />);

    await waitFor(() => {
      expect(getByText("+ ביקורת חדשה")).toBeTruthy();
    });

    fireEvent.press(getByText("+ ביקורת חדשה"));
    fireEvent.changeText(getByPlaceholderText("2026-04-20T10:00"), "2026-05-10T10:00");
    fireEvent.press(getByText("שמור"));

    await waitFor(() => {
      expect(createBuildingInspection).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: "template-1",
          employeeId: "emp-1",
        })
      );

      expect(alertSpy).toHaveBeenCalledWith(
        "הצלחה",
        "הביקורת התקופתית נוצרה בהצלחה"
      );
    });

    alertSpy.mockRestore();
  });

  test("shows validation error when due date is missing", async () => {
    getBuildingInspections.mockResolvedValueOnce([]);
    listInspectionTemplates.mockResolvedValueOnce([template]);
    listProviders.mockResolvedValueOnce([employee]);

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = render(<CommitteeInspectionsScreen />);

    await waitFor(() => {
      expect(getByText("+ ביקורת חדשה")).toBeTruthy();
    });

    fireEvent.press(getByText("+ ביקורת חדשה"));
    fireEvent.changeText(getByPlaceholderText("2026-04-20T10:00"), "");
    fireEvent.press(getByText("שמור"));

    expect(alertSpy).toHaveBeenCalledWith("שגיאה", "יש להזין תאריך יעד");

    alertSpy.mockRestore();
  });

  test("shows alert on loading error", async () => {
    getBuildingInspections.mockRejectedValueOnce(new Error("Network error"));
    listInspectionTemplates.mockResolvedValueOnce([]);
    listProviders.mockResolvedValueOnce([]);

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    render(<CommitteeInspectionsScreen />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("שגיאה", "Network error");
    });

    alertSpy.mockRestore();
  });
});