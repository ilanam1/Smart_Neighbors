import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

// ⚠️ עדכן נתיב לפי הפרויקט שלך
import BuildingRulesScreen from "../screens/BuildingRulesScreen";

// ---- Mocks ----
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

const mockGetBuildingRules = jest.fn();
const mockSaveBuildingRules = jest.fn();

jest.mock("../buildingRulesApi", () => ({
  getBuildingRules: (...args) => mockGetBuildingRules(...args),
  saveBuildingRules: (...args) => mockSaveBuildingRules(...args),
}));

describe("BuildingRulesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("מציג טעינה ואז מציג נהלים שנשלפו (דייר - read only)", async () => {
    mockGetBuildingRules.mockResolvedValue({
      id: 1,
      content: "נהלים לדוגמה",
      updated_at: new Date().toISOString(),
      updated_by: "committee",
    });

    const screen = render(
      <BuildingRulesScreen
        route={{
          params: { user: { id: "tenant" }, isCommittee: false },
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("נהלי שימוש במערכת")).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("נהלים לדוגמה")).toBeTruthy();
    });

    // לדיירים אין כפתור שמירה
    expect(screen.queryByText("שמירת נהלים")).toBeNull();
  });

  test("ועד בית יכול לשנות ולשמור (קורא ל-saveBuildingRules)", async () => {
    mockGetBuildingRules.mockResolvedValue({
      id: 1,
      content: "טקסט קודם",
      updated_at: new Date().toISOString(),
      updated_by: "committee",
    });

    mockSaveBuildingRules.mockResolvedValue({
      id: 1,
      content: "טקסט חדש",
      updated_at: new Date().toISOString(),
      updated_by: "committee-id",
    });

    const screen = render(
      <BuildingRulesScreen
        route={{
          params: { user: { id: "committee-id" }, isCommittee: true },
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("טקסט קודם")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByDisplayValue("טקסט קודם"), "טקסט חדש");
    fireEvent.press(screen.getByText("שמירת נהלים"));

    await waitFor(() => {
      expect(mockSaveBuildingRules).toHaveBeenCalledWith({
        content: "טקסט חדש",
        userId: "committee-id",
      });
    });
  });

  test("כפתור חזרה מפעיל navigation.goBack()", async () => {
    mockGetBuildingRules.mockResolvedValue({
      id: 1,
      content: "נהלים",
      updated_at: new Date().toISOString(),
      updated_by: "committee",
    });

    const screen = render(
      <BuildingRulesScreen
        route={{
          params: { user: { id: "u1" }, isCommittee: false },
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("נהלי שימוש במערכת")).toBeTruthy();
    });

    // ⚠️ אם הכפתור אצלך כתוב "↩ חזור" תחליף פה
    fireEvent.press(screen.getByText("חזרה"));

    expect(mockGoBack).toHaveBeenCalled();
  });

  test("כשל בשליפה -> מציג הודעת שגיאה", async () => {
    mockGetBuildingRules.mockRejectedValue(new Error("boom"));

    const screen = render(
      <BuildingRulesScreen
        route={{
          params: { user: { id: "u1" }, isCommittee: false },
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("שגיאה בטעינת הנהלים")).toBeTruthy();
    });
  });

  test("כשל בשמירה (ועד בית) -> מציג הודעת שגיאה", async () => {
    mockGetBuildingRules.mockResolvedValue({
      id: 1,
      content: "קיים",
      updated_at: new Date().toISOString(),
      updated_by: "committee",
    });

    mockSaveBuildingRules.mockRejectedValue(new Error("save fail"));

    const screen = render(
      <BuildingRulesScreen
        route={{
          params: { user: { id: "committee-id" }, isCommittee: true },
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("קיים")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("שמירת נהלים"));

    await waitFor(() => {
      expect(screen.getByText("שגיאה בשמירת הנהלים")).toBeTruthy();
    });
  });
});
