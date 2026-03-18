import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";
import IncomingLoanRequestsScreen from "../screens/IncomingLoanRequestsScreen";
import {
  getIncomingLoanRequests,
  approveLoanRequest,
  rejectLoanRequest,
} from "../API/equipmentLoansApi";
import { getSupabase } from "../DataBase/supabase";

jest.mock("../API/equipmentLoansApi", () => ({
  getIncomingLoanRequests: jest.fn(),
  approveLoanRequest: jest.fn(),
  rejectLoanRequest: jest.fn(),
}));

jest.mock("../DataBase/supabase", () => ({
  getSupabase: jest.fn(),
}));

describe("IncomingLoanRequestsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(Alert, "alert").mockImplementation((title, message, buttons) => {
      const confirmButton = buttons?.find((b) => b.text === "אישור" || b.text === "דחה");
      if (confirmButton?.onPress) {
        confirmButton.onPress();
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders incoming requests", async () => {
    getIncomingLoanRequests.mockResolvedValue([
      {
        id: "loan1",
        borrower_id: "u2",
        start_date: "2026-03-20",
        end_date: "2026-03-22",
        status: "pending",
        building_equipment: {
          title: "מקדחה",
          description: "מקדחה תקינה",
        },
      },
    ]);

    getSupabase.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          in: jest.fn().mockResolvedValue({
            data: [
              {
                auth_uid: "u2",
                first_name: "יוסי",
                last_name: "כהן",
                email: "yossi@test.com",
              },
            ],
            error: null,
          }),
        })),
      })),
    });

    const route = {
      params: {
        user: { id: "u-owner" },
      },
    };

    const { getByText } = render(
      <IncomingLoanRequestsScreen route={route} />
    );

    await waitFor(() => {
      expect(getByText("מקדחה")).toBeTruthy();
    });

    expect(getByText("יוסי כהן")).toBeTruthy();
    expect(getByText("ממתין לאישור")).toBeTruthy();
  });

  test("approves a request", async () => {
    getIncomingLoanRequests.mockResolvedValue([
      {
        id: "loan1",
        borrower_id: "u2",
        start_date: "2026-03-20",
        end_date: "2026-03-22",
        status: "pending",
        building_equipment: {
          title: "מקדחה",
          description: "מקדחה תקינה",
        },
      },
    ]);

    approveLoanRequest.mockResolvedValue({ id: "loan1", status: "approved" });

    getSupabase.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          in: jest.fn().mockResolvedValue({
            data: [
              {
                auth_uid: "u2",
                first_name: "יוסי",
                last_name: "כהן",
                email: "yossi@test.com",
              },
            ],
            error: null,
          }),
        })),
      })),
    });

    const route = {
      params: {
        user: { id: "u-owner" },
      },
    };

    const { getByText } = render(
      <IncomingLoanRequestsScreen route={route} />
    );

    await waitFor(() => {
      expect(getByText("אשר")).toBeTruthy();
    });

    fireEvent.press(getByText("אשר"));

    await waitFor(() => {
      expect(approveLoanRequest).toHaveBeenCalledWith("loan1");
    });
  });

  test("rejects a request", async () => {
    getIncomingLoanRequests.mockResolvedValue([
      {
        id: "loan1",
        borrower_id: "u2",
        start_date: "2026-03-20",
        end_date: "2026-03-22",
        status: "pending",
        building_equipment: {
          title: "מקדחה",
          description: "מקדחה תקינה",
        },
      },
    ]);

    rejectLoanRequest.mockResolvedValue({ id: "loan1", status: "rejected" });

    getSupabase.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          in: jest.fn().mockResolvedValue({
            data: [
              {
                auth_uid: "u2",
                first_name: "יוסי",
                last_name: "כהן",
                email: "yossi@test.com",
              },
            ],
            error: null,
          }),
        })),
      })),
    });

    const route = {
      params: {
        user: { id: "u-owner" },
      },
    };

    const { getByText } = render(
      <IncomingLoanRequestsScreen route={route} />
    );

    await waitFor(() => {
      expect(getByText("דחה")).toBeTruthy();
    });

    fireEvent.press(getByText("דחה"));

    await waitFor(() => {
      expect(rejectLoanRequest).toHaveBeenCalledWith("loan1");
    });
  });
});