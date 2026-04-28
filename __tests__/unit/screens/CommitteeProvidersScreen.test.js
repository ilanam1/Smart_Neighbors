import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import CommitteeProvidersScreen from "../../../screens/CommitteeProvidersScreen";
import {
  listProviders,
  createProvider,
  deleteProvider,
  listCompanies,
  listEmployeesByCompany,
  assignEmployeeToBuilding
} from "../../../API/serviceProvidersApi";
import { requestEmployeeAssignmentSelf } from "../../../API/notificationsApi";

jest.mock("../../../API/serviceProvidersApi", () => ({
  listProviders: jest.fn(),
  createProvider: jest.fn(),
  deleteProvider: jest.fn(),
  listCompanies: jest.fn(),
  listEmployeesByCompany: jest.fn(),
  assignEmployeeToBuilding: jest.fn()
}));

jest.mock("../../../API/notificationsApi", () => ({
  requestEmployeeAssignmentSelf: jest.fn()
}));

describe("CommitteeProvidersScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("טוען ספקים וחברות ומציג אותם", async () => {
    listCompanies.mockResolvedValueOnce([{ id: 'c1', name: 'Cleaning Co' }]);
    listProviders.mockResolvedValueOnce([
      { id: 1, name: "יוסי אינסטלציה", category: "PLUMBER", phone: "050" },
    ]);
    listEmployeesByCompany.mockResolvedValueOnce([]);

    const { getByText, queryByText } = render(<CommitteeProvidersScreen />);

    expect(queryByText("אין ספקים עדיין. הוסף ספק חדש.")).toBeNull();

    await waitFor(() => {
      expect(getByText("יוסי אינסטלציה")).toBeTruthy();
    });

    expect(listProviders).toHaveBeenCalled();
  });

  test("כאשר אין ספקים מציג הודעה ריקה", async () => {
    listCompanies.mockResolvedValueOnce([]);
    listProviders.mockResolvedValueOnce([]);

    const { getByText } = render(<CommitteeProvidersScreen />);

    await waitFor(() => {
      expect(getByText("אין ספקים עדיין. הוסף ספק חדש.")).toBeTruthy();
    });
  });


});
