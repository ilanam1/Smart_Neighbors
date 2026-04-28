import {
  listInspectionTemplates,
  createBuildingInspection,
  getBuildingInspections,
  getEmployeePeriodicInspections,
  getInspectionById,
  completeInspection,
  skipInspection,
} from "../../../API/inspectionsApi";

import { mockSupabase } from "../../__mocks__/@supabase/supabase-js";

describe("inspectionsApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const user = { id: "user-1" };

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

  const mockMaybeSingleQuery = (data, error = null) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockSingleQuery = (data, error = null) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockInsertQuery = (data, error = null) => ({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockUpdateQuery = (data, error = null) => ({
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockPlainInsertQuery = (error = null) => ({
    insert: jest.fn().mockResolvedValue({ error }),
  });

  const mockAuth = () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user },
      error: null,
    });
  };

  test("listInspectionTemplates returns templates ordered by name", async () => {
    const templatesQuery = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [{ id: "t1", name: "בדיקת מעלית" }],
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation((table) => {
      if (table === "inspection_templates") return templatesQuery;
    });

    const result = await listInspectionTemplates();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("בדיקת מעלית");
    expect(templatesQuery.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  test("createBuildingInspection validates employee building link and creates inspection", async () => {
    mockAuth();

    const profileQuery = mockProfileQuery();
    const employeeLinkQuery = mockMaybeSingleQuery({ employee_id: "emp-1" });
    const insertQuery = mockInsertQuery({
      id: "inspection-1",
      building_id: "building-1",
      employee_id: "emp-1",
      status: "PENDING",
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "employee_buildings") return employeeLinkQuery;
      if (table === "building_inspections") return insertQuery;
    });

    const result = await createBuildingInspection({
      templateId: "template-1",
      employeeId: "emp-1",
      dueDate: "2026-05-10T10:00:00.000Z",
    });

    expect(result.id).toBe("inspection-1");
    expect(insertQuery.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        building_id: "building-1",
        template_id: "template-1",
        employee_id: "emp-1",
        created_by: "user-1",
        due_date: "2026-05-10T10:00:00.000Z",
        status: "PENDING",
      }),
    ]);
  });

  test("createBuildingInspection blocks employee not linked to building", async () => {
    mockAuth();

    const profileQuery = mockProfileQuery();
    const employeeLinkQuery = mockMaybeSingleQuery(null);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "employee_buildings") return employeeLinkQuery;
    });

    await expect(
      createBuildingInspection({
        templateId: "template-1",
        employeeId: "emp-1",
        dueDate: "2026-05-10T10:00:00.000Z",
      })
    ).rejects.toThrow("העובד שנבחר אינו משויך לבניין זה");
  });

  test("getBuildingInspections returns effective OVERDUE status for old pending inspection", async () => {
    mockAuth();

    const profileQuery = mockProfileQuery();
    const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const inspectionsQuery = mockOrderQuery([
      {
        id: "inspection-1",
        status: "PENDING",
        due_date: oldDate,
        inspection_templates: { name: "בדיקה" },
      },
    ]);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") return profileQuery;
      if (table === "building_inspections") return inspectionsQuery;
    });

    const result = await getBuildingInspections();

    expect(result[0].effective_status).toBe("OVERDUE");
  });

  test("getEmployeePeriodicInspections returns employee inspections", async () => {
    const inspectionsQuery = mockOrderQuery([
      {
        id: "inspection-1",
        employee_id: "emp-1",
        status: "PENDING",
        due_date: new Date(Date.now() + 1000000).toISOString(),
      },
    ]);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "building_inspections") return inspectionsQuery;
    });

    const result = await getEmployeePeriodicInspections("emp-1");

    expect(result).toHaveLength(1);
    expect(inspectionsQuery.eq).toHaveBeenCalledWith("employee_id", "emp-1");
    expect(result[0].effective_status).toBe("PENDING");
  });

  test("getInspectionById returns inspection with effective status", async () => {
    const inspectionQuery = mockSingleQuery({
      id: "inspection-1",
      employee_id: "emp-1",
      status: "PENDING",
      due_date: new Date(Date.now() + 1000000).toISOString(),
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === "building_inspections") return inspectionQuery;
    });

    const result = await getInspectionById("inspection-1");

    expect(result.id).toBe("inspection-1");
    expect(result.effective_status).toBe("PENDING");
  });

  test("completeInspection completes inspection and creates next recurring inspection", async () => {
    const inspection = {
      id: "inspection-1",
      building_id: "building-1",
      template_id: "template-1",
      employee_id: "emp-1",
      created_by: "committee-1",
      due_date: "2026-05-10T10:00:00.000Z",
      status: "PENDING",
      buildings: { address: "Main 1" },
      inspection_templates: {
        name: "בדיקת מעלית",
        frequency_unit: "MONTH",
        frequency_value: 1,
        requires_notes: true,
      },
    };

    const getByIdQuery = mockSingleQuery(inspection);
    const updateQuery = mockUpdateQuery({ id: "inspection-1", status: "COMPLETED" });
    const nextInsertQuery = mockPlainInsertQuery();

    let buildingInspectionsCall = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === "building_inspections") {
        buildingInspectionsCall += 1;
        if (buildingInspectionsCall === 1) return getByIdQuery;
        if (buildingInspectionsCall === 2) return updateQuery;
        return nextInsertQuery;
      }
    });

    const result = await completeInspection({
      inspectionId: "inspection-1",
      employeeId: "emp-1",
      resultStatus: "OK",
      notes: "הכול תקין",
    });

    expect(result.updatedInspection.status).toBe("COMPLETED");
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "COMPLETED",
        notes: "הכול תקין",
        last_result: "OK",
        created_issue_report: false,
      })
    );
    expect(nextInsertQuery.insert).toHaveBeenCalled();
  });

  test("completeInspection creates disturbance report when issue was found", async () => {
    const inspection = {
      id: "inspection-1",
      building_id: "building-1",
      template_id: "template-1",
      employee_id: "emp-1",
      created_by: "committee-1",
      due_date: "2026-05-10T10:00:00.000Z",
      status: "PENDING",
      buildings: { address: "Main 1" },
      inspection_templates: {
        name: "בדיקת בטיחות",
        frequency_unit: "WEEK",
        frequency_value: 1,
        requires_notes: false,
      },
    };

    const getByIdQuery = mockSingleQuery(inspection);
    const updateQuery = mockUpdateQuery({ id: "inspection-1", status: "COMPLETED" });
    const nextInsertQuery = mockPlainInsertQuery();

    let buildingInspectionsCall = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === "building_inspections") {
        buildingInspectionsCall += 1;
        if (buildingInspectionsCall === 1) return getByIdQuery;
        if (buildingInspectionsCall === 2) return updateQuery;
        return nextInsertQuery;
      }
    });

    mockSupabase.rpc.mockResolvedValueOnce({
      data: { id: "disturbance-1" },
      error: null,
    });

    const result = await completeInspection({
      inspectionId: "inspection-1",
      employeeId: "emp-1",
      resultStatus: "ISSUE_FOUND",
      notes: "נמצאה תקלה",
      createIssueReport: true,
      issueType: "SAFETY",
      issueSeverity: "HIGH",
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "create_disturbance_from_inspection",
      expect.objectContaining({
        p_employee_id: "emp-1",
        p_building_id: "building-1",
        p_type: "SAFETY",
        p_severity: "HIGH",
        p_description: "נמצאה תקלה",
      })
    );
    expect(result.createdReport).toEqual({ id: "disturbance-1" });
  });

  test("completeInspection requires notes when template requires notes", async () => {
    const inspection = {
      id: "inspection-1",
      employee_id: "emp-1",
      status: "PENDING",
      due_date: "2026-05-10T10:00:00.000Z",
      inspection_templates: {
        requires_notes: true,
      },
    };

    const getByIdQuery = mockSingleQuery(inspection);

    mockSupabase.from.mockImplementation((table) => {
      if (table === "building_inspections") return getByIdQuery;
    });

    await expect(
      completeInspection({
        inspectionId: "inspection-1",
        employeeId: "emp-1",
        resultStatus: "OK",
        notes: "",
      })
    ).rejects.toThrow("יש למלא הערות עבור ביקורת זו");
  });

  test("skipInspection marks inspection as skipped", async () => {
    const inspection = {
      id: "inspection-1",
      employee_id: "emp-1",
      status: "PENDING",
      due_date: "2026-05-10T10:00:00.000Z",
    };

    const getByIdQuery = mockSingleQuery(inspection);
    const updateQuery = mockUpdateQuery({ id: "inspection-1", status: "SKIPPED" });

    let call = 0;
    mockSupabase.from.mockImplementation((table) => {
      if (table === "building_inspections") {
        call += 1;
        return call === 1 ? getByIdQuery : updateQuery;
      }
    });

    const result = await skipInspection("inspection-1", "emp-1", "לא ניתן לבצע היום");

    expect(result.status).toBe("SKIPPED");
    expect(updateQuery.update).toHaveBeenCalledWith({
      status: "SKIPPED",
      notes: "לא ניתן לבצע היום",
      last_result: "NOT_COMPLETED",
    });
  });
});