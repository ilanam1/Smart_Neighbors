import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

import EmployeePeriodicInspectionsScreen from "../../../screens/EmployeePeriodicInspectionsScreen";

import { getEmployeePeriodicInspections } from "../../../API/inspectionsApi";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useIsFocused: () => true,
}));

jest.mock("../../../API/inspectionsApi", () => ({
  getEmployeePeriodicInspections: jest.fn(),
}));

describe("EmployeePeriodicInspectionsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const route = {
    params: {
      employeeId: "emp-1",
    },
  };

  const inspection = {
    id: "inspection-1",
    due_date: "2026-05-10T10:00:00.000Z",
    status: "PENDING",
    effective_status: "OVERDUE",
    buildings: {
      id: "building-1",
      name: "Building A",
    },
    inspection_templates: {
      id: "template-1",
      name: "בדיקת מעלית",
      priority: "HIGH",
    },
  };

  test("loads and renders employee inspections", async () => {
    getEmployeePeriodicInspections.mockResolvedValueOnce([inspection]);

    const { getByText } = render(<EmployeePeriodicInspectionsScreen route={route} />);

    await waitFor(() => {
      expect(getByText("ביקורות תקופתיות")).toBeTruthy();
      expect(getByText("בדיקת מעלית")).toBeTruthy();
      expect(getByText("בניין: Building A")).toBeTruthy();
      expect(getByText("עדיפות: גבוהה")).toBeTruthy();
      expect(getByText("באיחור")).toBeTruthy();
      expect(getByText("לחץ לפתיחת הביקורת")).toBeTruthy();
    });

    expect(getEmployeePeriodicInspections).toHaveBeenCalledWith("emp-1");
  });

  test("navigates to inspection details when pressing card", async () => {
    getEmployeePeriodicInspections.mockResolvedValueOnce([inspection]);

    const { getByText } = render(<EmployeePeriodicInspectionsScreen route={route} />);

    await waitFor(() => {
      expect(getByText("בדיקת מעלית")).toBeTruthy();
    });

    fireEvent.press(getByText("בדיקת מעלית"));

    expect(mockNavigate).toHaveBeenCalledWith("EmployeeInspectionDetails", {
      inspectionId: "inspection-1",
      employeeId: "emp-1",
    });
  });

  test("renders empty state", async () => {
    getEmployeePeriodicInspections.mockResolvedValueOnce([]);

    const { getByText } = render(<EmployeePeriodicInspectionsScreen route={route} />);

    await waitFor(() => {
      expect(getByText("אין לך ביקורות תקופתיות כרגע.")).toBeTruthy();
    });
  });

  test("shows alert on loading error", async () => {
    getEmployeePeriodicInspections.mockRejectedValueOnce(new Error("Network error"));

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    render(<EmployeePeriodicInspectionsScreen route={route} />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("שגיאה", "Network error");
    });

    alertSpy.mockRestore();
  });
});