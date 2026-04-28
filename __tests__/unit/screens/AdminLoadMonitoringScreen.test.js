import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

import AdminLoadMonitoringScreen from "../../../screens/AdminLoadMonitoringScreen";

import {
  getAdminLoadMonitoringData,
  flagUserForReview,
  unflagUser,
  blockUser,
  unblockUser,
} from "../../../API/adminLoadMonitoringApi";

jest.mock("../../../API/adminLoadMonitoringApi", () => ({
  getAdminLoadMonitoringData: jest.fn(),
  flagUserForReview: jest.fn(),
  unflagUser: jest.fn(),
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
}));

const navigationMock = {
  goBack: jest.fn(),
};

const adminUser = { id: "admin-1", full_name: "Admin" };

const mockData = {
  kpis: {
    openRequests: 5,
    openDisturbances: 3,
    overloadedBuildings: 1,
    suspiciousUsers: 1,
  },
  alerts: [
    {
      type: "building_requests_spike",
      severity: "HIGH",
      title: "עומס בקשות בבניין Building A",
      message: "נפתחו 8 בקשות ב-24 השעות האחרונות.",
    },
  ],
  buildingLoad: [
    {
      buildingId: "b1",
      buildingName: "Building A",
      requests24h: 8,
      disturbances24h: 2,
      openRequests: 5,
      openDisturbances: 3,
      isOverloaded: true,
    },
  ],
  suspiciousUsers: [
    {
      auth_uid: "user-1",
      name: "Test User",
      email: "test@example.com",
      buildingName: "Building A",
      requests24h: 5,
      disturbances24h: 2,
      total24h: 7,
      is_flagged: false,
      is_blocked: false,
    },
  ],
};

describe("AdminLoadMonitoringScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads and renders monitoring data", async () => {
    getAdminLoadMonitoringData.mockResolvedValueOnce(mockData);

    const { getByText, getAllByText } = render(
      <AdminLoadMonitoringScreen
        navigation={navigationMock}
        route={{ params: { adminUser } }}
      />
    );

    await waitFor(() => {
      expect(getByText("ניטור עומסים והתנהגות חריגה")).toBeTruthy();
      expect(getByText("בקשות פתוחות")).toBeTruthy();
      expect(getByText("מטרדים פתוחים")).toBeTruthy();
      expect(getByText("בניינים בעומס")).toBeTruthy();
      expect(getAllByText("משתמשים חריגים").length).toBeGreaterThan(0);
      expect(getByText("Building A")).toBeTruthy();
      expect(getByText("Test User")).toBeTruthy();
    });

    expect(getAdminLoadMonitoringData).toHaveBeenCalledWith(adminUser, 7);
  });

  test("renders empty states when there are no alerts or suspicious users", async () => {
    getAdminLoadMonitoringData.mockResolvedValueOnce({
      kpis: {
        openRequests: 0,
        openDisturbances: 0,
        overloadedBuildings: 0,
        suspiciousUsers: 0,
      },
      alerts: [],
      buildingLoad: [],
      suspiciousUsers: [],
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
    });
  });

  test("goes back when admin user is missing", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    render(
      <AdminLoadMonitoringScreen
        navigation={navigationMock}
        route={{ params: {} }}
      />
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("שגיאה", "לא התקבלו פרטי אדמין");
      expect(navigationMock.goBack).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  test("shows alert when loading data fails", async () => {
    getAdminLoadMonitoringData.mockRejectedValueOnce(new Error("Network error"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    render(
      <AdminLoadMonitoringScreen
        navigation={navigationMock}
        route={{ params: { adminUser } }}
      />
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("שגיאה", "Network error");
    });

    alertSpy.mockRestore();
  });

  test("flags suspicious user and reloads data", async () => {
    getAdminLoadMonitoringData
      .mockResolvedValueOnce(mockData)
      .mockResolvedValueOnce({
        ...mockData,
        suspiciousUsers: [
          {
            ...mockData.suspiciousUsers[0],
            is_flagged: true,
          },
        ],
      });

    flagUserForReview.mockResolvedValueOnce({ success: true });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = render(
      <AdminLoadMonitoringScreen
        navigation={navigationMock}
        route={{ params: { adminUser } }}
      />
    );

    await waitFor(() => {
      expect(getByText("סמן לבדיקה")).toBeTruthy();
    });

    fireEvent.press(getByText("סמן לבדיקה"));

    await waitFor(() => {
      expect(getByText("סימון משתמש לבדיקה")).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText("סיבה (אופציונלי)"), "פעילות חריגה");
    fireEvent.press(getByText("אישור"));

    await waitFor(() => {
      expect(flagUserForReview).toHaveBeenCalledWith(
        adminUser,
        "user-1",
        "פעילות חריגה"
      );
      expect(getAdminLoadMonitoringData).toHaveBeenCalledTimes(2);
      expect(alertSpy).toHaveBeenCalledWith("הצלחה", "הפעולה בוצעה בהצלחה");
    });

    alertSpy.mockRestore();
  });

  test("blocks suspicious user and reloads data", async () => {
    getAdminLoadMonitoringData
      .mockResolvedValueOnce(mockData)
      .mockResolvedValueOnce(mockData);

    blockUser.mockResolvedValueOnce({ success: true });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = render(
      <AdminLoadMonitoringScreen
        navigation={navigationMock}
        route={{ params: { adminUser } }}
      />
    );

    await waitFor(() => {
      expect(getByText("חסום")).toBeTruthy();
    });

    fireEvent.press(getByText("חסום"));

    await waitFor(() => {
      expect(getByText("חסימת משתמש")).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText("סיבה (אופציונלי)"), "ספאם");
    fireEvent.press(getByText("אישור"));

    await waitFor(() => {
      expect(blockUser).toHaveBeenCalledWith(adminUser, "user-1", "ספאם");
      expect(alertSpy).toHaveBeenCalledWith("הצלחה", "הפעולה בוצעה בהצלחה");
    });

    alertSpy.mockRestore();
  });

  test("unflags and unblocks existing user states", async () => {
    const flaggedBlockedData = {
      ...mockData,
      suspiciousUsers: [
        {
          ...mockData.suspiciousUsers[0],
          is_flagged: true,
          is_blocked: true,
        },
      ],
    };

    getAdminLoadMonitoringData
      .mockResolvedValueOnce(flaggedBlockedData)
      .mockResolvedValueOnce(flaggedBlockedData)
      .mockResolvedValueOnce(flaggedBlockedData);

    unflagUser.mockResolvedValueOnce({ success: true });
    unblockUser.mockResolvedValueOnce({ success: true });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText } = render(
      <AdminLoadMonitoringScreen
        navigation={navigationMock}
        route={{ params: { adminUser } }}
      />
    );

    await waitFor(() => {
      expect(getByText("הסר סימון")).toBeTruthy();
      expect(getByText("בטל חסימה")).toBeTruthy();
    });

    fireEvent.press(getByText("הסר סימון"));

    await waitFor(() => {
      expect(getByText("הסרת סימון")).toBeTruthy();
    });

    fireEvent.press(getByText("אישור"));

    await waitFor(() => {
      expect(unflagUser).toHaveBeenCalledWith(adminUser, "user-1");
    });

    fireEvent.press(getByText("בטל חסימה"));

    await waitFor(() => {
      expect(getByText("ביטול חסימה")).toBeTruthy();
    });

    fireEvent.press(getByText("אישור"));

    await waitFor(() => {
      expect(unblockUser).toHaveBeenCalledWith(adminUser, "user-1");
    });

    alertSpy.mockRestore();
  });
});