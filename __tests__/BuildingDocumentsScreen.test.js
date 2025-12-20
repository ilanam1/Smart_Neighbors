// tests/BuildingDocumentsScreen.test.js

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import BuildingDocumentsScreen from "../screens/BuildingDocumentsScreen";

// 👇 מוקים (mock) לכל מה שהקומפוננטה משתמשת בו

// mock לניווט של React Navigation
const mockGoBack = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

// mock ל-supabase
jest.mock("../DataBase/supabase", () => ({
  getSupabase: () => ({
    storage: {
      from: () => ({
        getPublicUrl: (path) => ({
          data: { publicUrl: "https://example.com/" + path },
        }),
      }),
    },
  }),
}));

// mock ל-API של המסמכים
const mockGetBuildingDocuments = jest.fn();
const mockUploadBuildingDocument = jest.fn();
const mockDeleteBuildingDocument = jest.fn();

jest.mock("../buildingDocumentsApi", () => ({
  getBuildingDocuments: (...args) => mockGetBuildingDocuments(...args),
  uploadBuildingDocument: (...args) => mockUploadBuildingDocument(...args),
  deleteBuildingDocument: (...args) => mockDeleteBuildingDocument(...args),
}));

// mock ל-picker של המסמכים
const mockPick = jest.fn();
jest.mock("@react-native-documents/picker", () => ({
  pick: (...args) => mockPick(...args),
  types: {
    allFiles: "*/*",
  },
}));

// ====================
//
//      TESTS
//
// ====================

describe("BuildingDocumentsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 🔹 בדיקה 1: דייר רגיל – אין מסמכים, מוצגת הודעת "אין מסמכים"
  test("shows empty state when there are no documents", async () => {
    mockGetBuildingDocuments.mockResolvedValueOnce([]); // אין מסמכים

    const route = {
      params: {
        user: { id: "user-1" },
        isCommittee: false,
        buildingId: 1,
      },
    };

    const { getByText } = render(
      <BuildingDocumentsScreen route={route} />
    );

    await waitFor(() => {
      expect(getByText("אין עדיין מסמכים לבניין.")).toBeTruthy();
    });
  });

  // 🔹 בדיקה 2: דייר רגיל – כפתור העלאת מסמך לא קיים
  test("tenant user does NOT see upload button", async () => {
    mockGetBuildingDocuments.mockResolvedValueOnce([]);

    const route = {
      params: {
        user: { id: "user-1" },
        isCommittee: false, // לא ועד
        buildingId: 1,
      },
    };

    const { queryByText } = render(
      <BuildingDocumentsScreen route={route} />
    );

    await waitFor(() => {
      expect(queryByText("העלאת מסמך")).toBeNull();
    });
  });

  // 🔹 בדיקה 3: ועד בית – רואה כפתור העלאה, לחיצה קוראת ל-uploadBuildingDocument
  test("committee user sees upload button and can trigger upload", async () => {
    mockGetBuildingDocuments.mockResolvedValueOnce([]);

    // המדמה תוצאה של picker
    mockPick.mockResolvedValueOnce([
      {
        name: "test-doc.pdf",
        mimeType: "application/pdf",
        uri: "file:///test-doc.pdf",
        fileCopyUri: "file:///copy-test-doc.pdf",
      },
    ]);

    mockUploadBuildingDocument.mockResolvedValueOnce({});

    const route = {
      params: {
        user: { id: "committee-1" },
        isCommittee: true,
        buildingId: 1,
      },
    };

    const { getByText } = render(
      <BuildingDocumentsScreen route={route} />
    );

    // קודם כל לוודא שהכפתור קיים
    const uploadButton = await waitFor(() =>
      getByText("העלאת מסמך")
    );

    // לוחצים על כפתור העלאה
    fireEvent.press(uploadButton);

    // מצפים שהפונקציה של upload נקראה עם פרמטרים מתאימים
    await waitFor(() => {
      expect(mockUploadBuildingDocument).toHaveBeenCalledTimes(1);
      const args = mockUploadBuildingDocument.mock.calls[0][0];

      expect(args.name).toBe("test-doc.pdf");
      expect(args.title).toBe("test-doc.pdf");
      expect(args.buildingId).toBe(1);
      expect(args.userId).toBe("committee-1");
    });
  });

  // 🔹 בדיקה 4: כפתור "חזרה למסך הקודם" קורא ל-navigation.goBack
  test("back button calls navigation.goBack", async () => {
    mockGetBuildingDocuments.mockResolvedValueOnce([]);

    const route = {
      params: {
        user: { id: "user-1" },
        isCommittee: false,
        buildingId: 1,
      },
    };

    const { getByText } = render(
      <BuildingDocumentsScreen route={route} />
    );

    const backButton = getByText("חזרה למסך הקודם");

    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
