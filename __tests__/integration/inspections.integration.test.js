import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

import CommitteeInspectionsScreen from "../../screens/CommitteeInspectionsScreen";
import EmployeePeriodicInspectionsScreen from "../../screens/EmployeePeriodicInspectionsScreen";

import { mockSupabase } from "../__mocks__/@supabase/supabase-js";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useIsFocused: () => true,
}));

jest.mock("../../API/serviceProvidersApi", () => ({
  listProviders: jest.fn().mockResolvedValue([
    {
      id: "emp-1",
      name: "Moshe Worker",
    },
  ]),
}));

describe("inspections integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProfileQuery = () => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { building_id: "building-1" },
      error: null,
    }),
  });

  const mockOrderQuery = (data, error = null) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockTemplatesQuery = (data, error = null) => ({
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockMaybeSingleQuery = (data, error = null) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockInsertQuery = (data, error = null) => ({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  });

  test("committee loads inspections, templates and employees from API layer", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "committee-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery();

    const inspectionsQuery = mockOrderQuery([
      {
        id: "inspection-1",
        building_id: "building-1",
        employee_id: "emp-1",
        status: "PENDING",
        due_date: "2026-05-10T10:00:00.000Z",
        inspection_templates: {
          id: "template-1",
          name: "בדיקת מעלית",
          description: "בדיקה חודשית",
          priority: "HIGH",
        },
        service_employees: {
          id: "emp-1",
          full_name: "Moshe Worker",
          phone: "0500000000",
        },
      },
    ]);

    const templatesQuery = mockTemplatesQuery([
      {
        id: "template-1",
        name: "בדיקת מעלית",
        description: "בדיקה חודשית",
        priority: "HIGH",
      },
    ]);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "building_inspections") return inspectionsQuery;
      if (table === "inspection_templates") return templatesQuery;
    });

    const { getByText } = render(<CommitteeInspectionsScreen />);

    await waitFor(() => {
      expect(getByText("ביקורות תקופתיות")).toBeTruthy();
      expect(getByText("בדיקת מעלית")).toBeTruthy();
      expect(getByText("עובד אחראי: Moshe Worker")).toBeTruthy();
      expect(getByText("עדיפות: גבוהה")).toBeTruthy();
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("building_inspections");
    expect(mockSupabase.from).toHaveBeenCalledWith("inspection_templates");
  });

  test("committee creates inspection through UI and API layer", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "committee-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery();
    const emptyInspectionsQuery = mockOrderQuery([]);
    const templatesQuery = mockTemplatesQuery([
      {
        id: "template-1",
        name: "בדיקת מעלית",
        description: "בדיקה חודשית",
        priority: "HIGH",
      },
    ]);
    const employeeLinkQuery = mockMaybeSingleQuery({ employee_id: "emp-1" });
    const insertQuery = mockInsertQuery({
      id: "inspection-1",
      employee_id: "emp-1",
      template_id: "template-1",
      status: "PENDING",
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "inspection_templates") return templatesQuery;
      if (table === "employee_buildings") return employeeLinkQuery;
      if (table === "building_inspections") {
        const calls = mockSupabase.from.mock.calls.filter(
          (c) => c[0] === "building_inspections"
        ).length;

        if (calls === 2) return insertQuery;
        return emptyInspectionsQuery;
      }
    });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = render(<CommitteeInspectionsScreen />);

    await waitFor(() => {
      expect(getByText("+ ביקורת חדשה")).toBeTruthy();
    });

    fireEvent.press(getByText("+ ביקורת חדשה"));
    fireEvent.changeText(getByPlaceholderText("2026-04-20T10:00"), "2026-05-10T10:00");
    fireEvent.press(getByText("שמור"));

    await waitFor(() => {
      expect(insertQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          building_id: "building-1",
          template_id: "template-1",
          employee_id: "emp-1",
          created_by: "committee-1",
          status: "PENDING",
        }),
      ]);

      expect(alertSpy).toHaveBeenCalledWith(
        "הצלחה",
        "הביקורת התקופתית נוצרה בהצלחה"
      );
    });

    alertSpy.mockRestore();
  });

  test("employee sees inspections from API layer and can navigate to details", async () => {
    const inspectionsQuery = mockOrderQuery([
      {
        id: "inspection-1",
        employee_id: "emp-1",
        status: "PENDING",
        effective_status: "PENDING",
        due_date: "2026-05-10T10:00:00.000Z",
        buildings: {
          id: "building-1",
          name: "Building A",
          address: "Main 1",
          city: "Beer Sheva",
        },
        inspection_templates: {
          id: "template-1",
          name: "בדיקת מעלית",
          description: "בדיקה חודשית",
          priority: "HIGH",
        },
      },
    ]);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "building_inspections") return inspectionsQuery;
    });

    const { getByText } = render(
      <EmployeePeriodicInspectionsScreen route={{ params: { employeeId: "emp-1" } }} />
    );

    await waitFor(() => {
      expect(getByText("בדיקת מעלית")).toBeTruthy();
      expect(getByText("בניין: Building A")).toBeTruthy();
    });

    fireEvent.press(getByText("בדיקת מעלית"));

    expect(mockNavigate).toHaveBeenCalledWith("EmployeeInspectionDetails", {
      inspectionId: "inspection-1",
      employeeId: "emp-1",
    });
  });

  test("committee receives validation error when employee is not linked to building", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "committee-1" } },
      error: null,
    });

    const profileQuery = mockProfileQuery();
    const emptyInspectionsQuery = mockOrderQuery([]);
    const templatesQuery = mockTemplatesQuery([
      {
        id: "template-1",
        name: "בדיקת מעלית",
        priority: "HIGH",
      },
    ]);
    const employeeLinkQuery = mockMaybeSingleQuery(null);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "inspection_templates") return templatesQuery;
      if (table === "employee_buildings") return employeeLinkQuery;
      if (table === "building_inspections") return emptyInspectionsQuery;
    });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = render(<CommitteeInspectionsScreen />);

    await waitFor(() => {
      expect(getByText("+ ביקורת חדשה")).toBeTruthy();
    });

    fireEvent.press(getByText("+ ביקורת חדשה"));
    fireEvent.changeText(getByPlaceholderText("2026-04-20T10:00"), "2026-05-10T10:00");
    fireEvent.press(getByText("שמור"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "שגיאה",
        "העובד שנבחר אינו משויך לבניין זה"
      );
    });

    alertSpy.mockRestore();
  });
});