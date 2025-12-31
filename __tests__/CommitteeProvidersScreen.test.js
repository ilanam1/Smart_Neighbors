// tests/CommitteeProvidersScreen.test.js
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import CommitteeProvidersScreen from "../screens/CommitteeProvidersScreen";

jest.mock("../serviceProvidersApi", () => ({
  listProviders: jest.fn(),
  createProvider: jest.fn(),
  updateProvider: jest.fn(),
  deleteProvider: jest.fn(),
}));

const {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
} = require("../serviceProvidersApi");

describe("CommitteeProvidersScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("טוען ספקים ומציג אותם", async () => {
    listProviders.mockResolvedValueOnce([
      { id: 1, name: "יוסי אינסטלציה", category: "PLUMBER", phone: "050", email: null, is_active: true },
    ]);

    const { getByText, queryByText } = render(<CommitteeProvidersScreen />);

    // בתחילה אין טקסט ריק
    expect(queryByText("אין ספקים עדיין. הוסף ספק חדש.")).toBeNull();

    // אחרי טעינה מציג ספק
    await waitFor(() => {
      expect(getByText("יוסי אינסטלציה")).toBeTruthy();
    });

    expect(listProviders).toHaveBeenCalledWith({ onlyActive: false });
    expect(getByText(/קטגוריה:/)).toBeTruthy();
    expect(getByText(/טלפון:/)).toBeTruthy();
    expect(getByText(/סטטוס:/)).toBeTruthy();
  });

  test("כאשר אין ספקים מציג הודעה ריקה", async () => {
    listProviders.mockResolvedValueOnce([]);

    const { getByText } = render(<CommitteeProvidersScreen />);

    await waitFor(() => {
      expect(getByText("אין ספקים עדיין. הוסף ספק חדש.")).toBeTruthy();
    });
  });

  test("יצירת ספק: ולידציה — בלי שם מציג Alert ולא קורא ל-API", async () => {
    listProviders.mockResolvedValueOnce([]);

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => { });
    const { getByText } = render(<CommitteeProvidersScreen />);

    await waitFor(() => {
      expect(getByText("אין ספקים עדיין. הוסף ספק חדש.")).toBeTruthy();
    });

    fireEvent.press(getByText("+ ספק חדש"));

    // נסה לשמור בלי שם
    fireEvent.press(getByText("צור"));

    expect(alertSpy).toHaveBeenCalledWith("שגיאה", "שם ספק הוא חובה");
    expect(createProvider).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  test("יצירת ספק: ממלא שם ושומר => קורא createProvider ואז עושה רענון", async () => {
    // קריאה ראשונה ל-load (ב-mount)
    listProviders.mockResolvedValueOnce([]);

    // אחרי יצירה, המסך קורא שוב load()
    listProviders.mockResolvedValueOnce([
      { id: 2, name: "דני חשמל", category: "ELECTRICIAN", phone: null, email: "d@d.com", is_active: true },
    ]);

    createProvider.mockResolvedValueOnce({ id: 2 });

    const { getByText, getByPlaceholderText } = render(<CommitteeProvidersScreen />);

    await waitFor(() => {
      expect(getByText("אין ספקים עדיין. הוסף ספק חדש.")).toBeTruthy();
    });

    fireEvent.press(getByText("+ ספק חדש"));

    fireEvent.changeText(getByPlaceholderText("לדוגמה: יוסי אינסטלציה"), "דני חשמל");

    fireEvent.press(getByText("צור"));

    await waitFor(() => {
      expect(createProvider).toHaveBeenCalledWith({
        name: "דני חשמל",
        phone: null,
        email: null,
        category: "GENERAL", // דיפולט
        notes: null,
      });
    });

    await waitFor(() => {
      expect(getByText("דני חשמל")).toBeTruthy();
    });

    expect(listProviders).toHaveBeenCalledTimes(2);
  });

  test("עריכת ספק: לוחץ עריכה -> שמור => קורא updateProvider עם is_active", async () => {
    listProviders.mockResolvedValueOnce([
      { id: 5, name: "ניקיון פלוס", category: "CLEANING", phone: "052", email: null, is_active: true },
    ]);

    // אחרי שמירה המסך עושה load מחדש
    listProviders.mockResolvedValueOnce([
      { id: 5, name: "ניקיון פלוס", category: "CLEANING", phone: "052", email: null, is_active: false },
    ]);

    updateProvider.mockResolvedValueOnce({ id: 5 });

    const { getByText, getAllByText } = render(<CommitteeProvidersScreen />);

    await waitFor(() => {
      expect(getByText("ניקיון פלוס")).toBeTruthy();
    });

    // יש כפתור "עריכה" בתוך הכרטיס
    fireEvent.press(getAllByText("עריכה")[0]);

    // בטופס של עריכה מופיע "שמור"
    fireEvent.press(getByText("שמור"));

    await waitFor(() => {
      expect(updateProvider).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          name: "ניקיון פלוס",
          category: "CLEANING",
          is_active: true, // שים לב: אם תרצה לבדוק toggle בפועל, נצטרך testID ל-Switch
        })
      );
    });
  });

  test("מחיקה: לוחץ מחק => מפעיל Alert => מאשר => קורא deleteProvider ואז רענון", async () => {
    listProviders
      .mockResolvedValueOnce([
        { id: 9, name: "כללי בע״מ", category: "GENERAL", phone: null, email: null, is_active: true },
      ])
      .mockResolvedValueOnce([]); // אחרי מחיקה load()

    deleteProvider.mockResolvedValueOnce(true);

    // Mock ל-Alert.alert שמפעיל אוטומטית את onPress של "מחק"
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((title, msg, buttons) => {
      const destructive = buttons?.find((b) => b.style === "destructive" || b.text === "מחק");
      if (destructive?.onPress) destructive.onPress();
    });

    const { getByText, getAllByText } = render(<CommitteeProvidersScreen />);

    await waitFor(() => {
      expect(getByText("כללי בע״מ")).toBeTruthy();
    });

    fireEvent.press(getAllByText("מחק")[0]);

    await waitFor(() => {
      expect(deleteProvider).toHaveBeenCalledWith(9);
    });

    await waitFor(() => {
      expect(getByText("אין ספקים עדיין. הוסף ספק חדש.")).toBeTruthy();
    });

    alertSpy.mockRestore();
  });
});
