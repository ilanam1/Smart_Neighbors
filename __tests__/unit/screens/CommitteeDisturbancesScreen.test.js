import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

import CommitteeDisturbancesScreen from "../../../screens/CommitteeDisturbancesScreen";

import { listProviders } from "../../../API/serviceProvidersApi";
import { getBuildingDisturbanceReports } from "../../../API/disturbancesApi";
import { createJobRequest, getJobsForReport } from "../../../API/jobRequestsApi";
import { createBuildingMaintenanceNotification } from "../../../API/notificationsApi";

import { mockSupabase } from "../../__mocks__/@supabase/supabase-js";

jest.mock("../../../API/serviceProvidersApi", () => ({
  listProviders: jest.fn(),
}));

jest.mock("../../../API/disturbancesApi", () => ({
  getBuildingDisturbanceReports: jest.fn(),
}));

jest.mock("../../../API/jobRequestsApi", () => ({
  createJobRequest: jest.fn(),
  getJobsForReport: jest.fn(),
}));

jest.mock("../../../API/notificationsApi", () => ({
  createBuildingMaintenanceNotification: jest.fn(),
}));

describe("CommitteeDisturbancesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "committee-user-1" } },
      error: null,
    });
  });

  const report = {
    id: "report-1",
    building_id: "building-1",
    title: "רעש בקומה 2",
    type: "NOISE",
    description: "רעש חזק בלילה",
    location: "קומה 2",
    severity: "HIGH",
    status: "OPEN",
    created_at: "2026-04-20T10:00:00Z",
  };

  const employee = {
    id: "emp-1",
    name: "Moshe Worker",
    category: "ניקיון",
    phone: "0500000000",
  };

  test("loads and renders disturbance reports", async () => {
    getBuildingDisturbanceReports.mockResolvedValueOnce([report]);
    listProviders.mockResolvedValueOnce([employee]);
    getJobsForReport.mockResolvedValueOnce([]);

    const { getByText } = render(<CommitteeDisturbancesScreen />);

    await waitFor(() => {
      expect(getByText("רעש בקומה 2")).toBeTruthy();
      expect(getByText("רעש חזק בלילה")).toBeTruthy();
      expect(getByText("ממתין לטיפול")).toBeTruthy();
      expect(getByText("פתח קריאת שירות לעובד")).toBeTruthy();
    });

    expect(getBuildingDisturbanceReports).toHaveBeenCalled();
    expect(listProviders).toHaveBeenCalled();
    expect(getJobsForReport).toHaveBeenCalledWith("report-1");
  });

  test("renders empty state when no disturbance reports exist", async () => {
    getBuildingDisturbanceReports.mockResolvedValueOnce([]);
    listProviders.mockResolvedValueOnce([]);

    const { getByText } = render(<CommitteeDisturbancesScreen />);

    await waitFor(() => {
      expect(getByText("אין עדיין דיווחי מטרדים בבניין שלך.")).toBeTruthy();
    });
  });

  test("renders error state when loading fails", async () => {
    getBuildingDisturbanceReports.mockRejectedValueOnce(
      new Error("Network error")
    );
    listProviders.mockResolvedValueOnce([]);

    const { getByText } = render(<CommitteeDisturbancesScreen />);

    await waitFor(() => {
      expect(getByText("שגיאה: Network error")).toBeTruthy();
    });
  });

  test("opens order modal and requires employee selection", async () => {
    getBuildingDisturbanceReports.mockResolvedValueOnce([report]);
    listProviders.mockResolvedValueOnce([employee]);
    getJobsForReport.mockResolvedValueOnce([]);

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText } = render(<CommitteeDisturbancesScreen />);

    await waitFor(() => {
      expect(getByText("פתח קריאת שירות לעובד")).toBeTruthy();
    });

    fireEvent.press(getByText("פתח קריאת שירות לעובד"));

    await waitFor(() => {
      expect(getByText("הפניית מטרד לטיפול עובד")).toBeTruthy();
      expect(getByText("Moshe Worker (ניקיון)")).toBeTruthy();
    });

    fireEvent.press(getByText("שלח קריאה לעובד היעודי"));

    expect(alertSpy).toHaveBeenCalledWith("שגיאה", "בחר עובד לביצוע המשימה");

    alertSpy.mockRestore();
  });

  test("creates job request and sends building maintenance notification", async () => {
    getBuildingDisturbanceReports
      .mockResolvedValueOnce([report])
      .mockResolvedValueOnce([report]);

    listProviders.mockResolvedValueOnce([employee]);

    getJobsForReport
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    createJobRequest.mockResolvedValueOnce({ id: "job-1" });
    createBuildingMaintenanceNotification.mockResolvedValueOnce({ id: "n1" });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = render(
      <CommitteeDisturbancesScreen />
    );

    await waitFor(() => {
      expect(getByText("פתח קריאת שירות לעובד")).toBeTruthy();
    });

    fireEvent.press(getByText("פתח קריאת שירות לעובד"));

    await waitFor(() => {
      expect(getByText("Moshe Worker (ניקיון)")).toBeTruthy();
    });

    fireEvent.press(getByText("Moshe Worker (ניקיון)"));

    fireEvent.changeText(
      getByPlaceholderText("לדוגמה: לנקות את חדר המדרגות בקומה 2"),
      "לטפל ברעש בקומה 2"
    );

    fireEvent.changeText(
      getByPlaceholderText("לדוגמה: היום אחהצ / בהקדם האפשרי"),
      "היום בערב"
    );

    fireEvent.press(getByText("שלח קריאה לעובד היעודי"));

    await waitFor(() => {
      expect(createJobRequest).toHaveBeenCalledWith({
        reportId: "report-1",
        employeeId: "emp-1",
        instructions: "לטפל ברעש בקומה 2",
        scheduleTime: "היום בערב",
      });

      expect(createBuildingMaintenanceNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          buildingId: "building-1",
          senderId: "committee-user-1",
          title: "הודעת תחזוקה לבניין 🔧",
          excludeUserId: "committee-user-1",
        })
      );

      expect(alertSpy).toHaveBeenCalledWith(
        "הצלחה",
        "קריאת שירות נשלחה בהצלחה לעובד!"
      );
    });

    alertSpy.mockRestore();
  });

  test("renders existing job assignment instead of create button", async () => {
    getBuildingDisturbanceReports.mockResolvedValueOnce([report]);
    listProviders.mockResolvedValueOnce([employee]);

    getJobsForReport.mockResolvedValueOnce([
      {
        id: "job-1",
        status: "ACCEPTED",
        instructions: "לטפל במטרד",
        schedule_time: "מחר בבוקר",
        service_employees: {
          full_name: "Worker One",
          phone: "0520000000",
        },
      },
    ]);

    const { getByText, queryByText } = render(<CommitteeDisturbancesScreen />);

    await waitFor(() => {
      expect(getByText("הקצאה פעילה:")).toBeTruthy();
      expect(getByText(/Worker One/)).toBeTruthy();
      expect(getByText("סטטוס הקריאה: העובד בדרך/אישר")).toBeTruthy();
    });

    expect(queryByText("פתח קריאת שירות לעובד")).toBeNull();
  });

  test("allows alternative assignment when previous job was rejected", async () => {
    getBuildingDisturbanceReports.mockResolvedValueOnce([report]);
    listProviders.mockResolvedValueOnce([employee]);

    getJobsForReport.mockResolvedValueOnce([
      {
        id: "job-1",
        status: "REJECTED",
        instructions: "העובד דחה",
        schedule_time: "מחר",
        service_employees: {
          full_name: "Worker One",
          phone: "0520000000",
        },
      },
    ]);

    const { getByText } = render(<CommitteeDisturbancesScreen />);

    await waitFor(() => {
      expect(getByText("הקצאה חלופית (העובד סירב)")).toBeTruthy();
    });

    fireEvent.press(getByText("הקצאה חלופית (העובד סירב)"));

    await waitFor(() => {
      expect(getByText("הפניית מטרד לטיפול עובד")).toBeTruthy();
      expect(getByText("Moshe Worker (ניקיון)")).toBeTruthy();
    });
  });
});