import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from 'react-native';
import BuildingRulesScreen from "../../../screens/BuildingRulesScreen";

const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

const mockGetBuildingRules = jest.fn();
const mockSaveBuildingRules = jest.fn();

jest.mock("../../../API/buildingRulesApi", () => ({
  getBuildingRules: (...args) => mockGetBuildingRules(...args),
  saveBuildingRules: (...args) => mockSaveBuildingRules(...args),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

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
      <BuildingRulesScreen route={{ params: { user: { id: "tenant" }, isCommittee: false } }} />
    );

    await waitFor(() => {
      expect(screen.getByText("חוקי הבניין")).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("נהלים לדוגמה")).toBeTruthy();
    });

    expect(screen.queryByText("שמירת חוקים")).toBeNull();
  });



  test("כפתור חזרה מפעיל navigation.goBack()", async () => {
    mockGetBuildingRules.mockResolvedValue({
      id: 1,
      content: "נהלים",
      updated_at: new Date().toISOString(),
      updated_by: "committee",
    });

    const screen = render(
      <BuildingRulesScreen route={{ params: { user: { id: "u1" }, isCommittee: false } }} />
    );

    await waitFor(() => {
      expect(screen.getByText("חוקי הבניין")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("חזרה"));

    expect(mockGoBack).toHaveBeenCalled();
  });

  test("כשל בשליפה -> מציג הודעת שגיאה", async () => {
    mockGetBuildingRules.mockRejectedValue(new Error("boom"));

    const screen = render(
      <BuildingRulesScreen route={{ params: { user: { id: "u1" }, isCommittee: false } }} />
    );

    await waitFor(() => {
      expect(screen.getByText("boom")).toBeTruthy();
    });
  });


});
