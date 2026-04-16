import { getSupabase } from "../DataBase/supabase";


const supabase = getSupabase();

async function getCurrentUserWithBuilding() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Error fetching current user:", userError.message);
    throw new Error("שגיאה בזיהוי המשתמש המחובר");
  }

  if (!user) {
    throw new Error("אין משתמש מחובר");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("building_id")
    .eq("auth_uid", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching profile:", profileError.message);
    throw new Error("שגיאה בשליפת פרטי הפרופיל");
  }

  if (!profile || !profile.building_id) {
    throw new Error("למשתמש המחובר עדיין לא משויך בניין");
  }

  return {
    user,
    buildingId: profile.building_id,
  };
}

function addFrequencyToDate(dateInput, unit, value) {
  const date = new Date(dateInput);

  if (unit === "WEEK") {
    date.setDate(date.getDate() + 7 * value);
  } else if (unit === "MONTH") {
    date.setMonth(date.getMonth() + value);
  } else if (unit === "QUARTER") {
    date.setMonth(date.getMonth() + 3 * value);
  } else if (unit === "YEAR") {
    date.setFullYear(date.getFullYear() + value);
  }

  return date.toISOString();
}

function getInspectionEffectiveStatus(item) {
  if (item.status === "PENDING") {
    const due = new Date(item.due_date);
    if (!isNaN(due.getTime()) && due.getTime() < Date.now()) {
      return "OVERDUE";
    }
  }
  return item.status;
}

export async function listInspectionTemplates() {
  const { data, error } = await supabase
    .from("inspection_templates")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching inspection templates:", error.message);
    throw new Error("שגיאה בשליפת תבניות הביקורת");
  }

  return data || [];
}

export async function createBuildingInspection({
  templateId,
  employeeId,
  dueDate,
}) {
  const { user, buildingId } = await getCurrentUserWithBuilding();

  // לוודא שהעובד אכן משויך לבניין
  const { data: employeeLink, error: employeeLinkError } = await supabase
    .from("employee_buildings")
    .select("employee_id")
    .eq("employee_id", employeeId)
    .eq("building_id", buildingId)
    .maybeSingle();

  if (employeeLinkError) {
    console.error("Error checking employee building link:", employeeLinkError.message);
    throw new Error("שגיאה בבדיקת שיוך העובד לבניין");
  }

  if (!employeeLink) {
    throw new Error("העובד שנבחר אינו משויך לבניין זה");
  }

  const { data, error } = await supabase
    .from("building_inspections")
    .insert([
      {
        building_id: buildingId,
        template_id: templateId,
        employee_id: employeeId,
        created_by: user.id,
        due_date: dueDate,
        status: "PENDING",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating building inspection:", error.message);
    throw new Error("שגיאה ביצירת הביקורת התקופתית");
  }

  return data;
}

export async function getBuildingInspections() {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from("building_inspections")
    .select(`
      *,
      inspection_templates (
        id,
        name,
        description,
        frequency_unit,
        frequency_value,
        priority,
        requires_notes,
        requires_photo
      ),
      service_employees (
        id,
        full_name,
        phone
      )
    `)
    .eq("building_id", buildingId)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching building inspections:", error.message);
    throw new Error("שגיאה בשליפת ביקורות הבניין");
  }

  return (data || []).map((item) => ({
    ...item,
    effective_status: getInspectionEffectiveStatus(item),
  }));
}

export async function getEmployeePeriodicInspections(employeeId) {
  const { data, error } = await supabase
    .from("building_inspections")
    .select(`
      *,
      buildings (
        id,
        name,
        address,
        city
      ),
      inspection_templates (
        id,
        name,
        description,
        frequency_unit,
        frequency_value,
        priority,
        requires_notes,
        requires_photo
      )
    `)
    .eq("employee_id", employeeId)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching employee inspections:", error.message);
    throw new Error("שגיאה בשליפת הביקורות התקופתיות");
  }

  return (data || []).map((item) => ({
    ...item,
    effective_status: getInspectionEffectiveStatus(item),
  }));
}

export async function getInspectionById(inspectionId) {
  const { data, error } = await supabase
    .from("building_inspections")
    .select(`
      *,
      buildings (
        id,
        name,
        address,
        city
      ),
      inspection_templates (
        id,
        name,
        description,
        frequency_unit,
        frequency_value,
        priority,
        requires_notes,
        requires_photo
      ),
      service_employees (
        id,
        full_name,
        phone
      )
    `)
    .eq("id", inspectionId)
    .single();

  if (error) {
    console.error("Error fetching inspection by id:", error.message);
    throw new Error("שגיאה בשליפת פרטי הביקורת");
  }

  return {
    ...data,
    effective_status: getInspectionEffectiveStatus(data),
  };
}



async function createDisturbanceReportFromInspection({
  inspection,
  employeeId,
  type,
  severity,
  description,
}) {
  const { data, error } = await supabase.rpc("create_disturbance_from_inspection", {
    p_employee_id: employeeId,
    p_building_id: inspection.building_id,
    p_type: type,
    p_severity: severity,
    p_description: description,
    p_location: inspection.buildings?.address || null,
  });

  if (error) {
    console.error("Error creating disturbance report from inspection:", error);
    throw new Error("שגיאה ביצירת תקלה מתוך ביקורת");
  }

  return data;
}

export async function completeInspection({
  inspectionId,
  employeeId,
  resultStatus,
  notes,
  createIssueReport = false,
  issueType = "OTHER",
  issueSeverity = "MEDIUM",
}) {
  const inspection = await getInspectionById(inspectionId);

  if (!inspection) {
    throw new Error("הביקורת לא נמצאה");
  }

  if (inspection.employee_id !== employeeId) {
    throw new Error("הביקורת אינה שייכת לעובד זה");
  }

  if (inspection.inspection_templates?.requires_notes && !notes?.trim()) {
    throw new Error("יש למלא הערות עבור ביקורת זו");
  }

  let createdReport = null;

  if (createIssueReport) {
    createdReport = await createDisturbanceReportFromInspection({
      inspection,
      employeeId: inspection.employee_id,
      type: issueType,
      severity: issueSeverity,
      description:
        notes?.trim() ||
        `נמצאה בעיה במהלך ביקורת תקופתית: ${inspection.inspection_templates?.name || "ביקורת"}`,
    });
  }

  const completedAt = new Date().toISOString();

  const { data: updatedInspection, error: updateError } = await supabase
    .from("building_inspections")
    .update({
      status: "COMPLETED",
      completed_at: completedAt,
      notes: notes?.trim() || null,
      last_result: resultStatus,
      created_issue_report: !!createIssueReport,
    })
    .eq("id", inspectionId)
    .select()
    .single();

  if (updateError) {
    console.error("Error completing inspection:", updateError);
    throw new Error("שגיאה בסימון הביקורת כבוצעה");
  }

  const template = inspection.inspection_templates;
  if (!template) {
    throw new Error("לא נמצאה תבנית ביקורת עבור הביקורת הנוכחית");
  }

  const nextDueDate = addFrequencyToDate(
    inspection.due_date,
    template.frequency_unit,
    template.frequency_value
  );

  const { error: nextError } = await supabase
    .from("building_inspections")
    .insert([
      {
        building_id: inspection.building_id,
        template_id: inspection.template_id,
        employee_id: inspection.employee_id,
        created_by: inspection.created_by || null,
        due_date: nextDueDate,
        status: "PENDING",
      },
    ]);

  if (nextError) {
    console.error("Error creating next recurring inspection:", nextError);
    throw new Error("הביקורת הושלמה, אך הייתה שגיאה ביצירת הביקורת הבאה");
  }

  return {
    updatedInspection,
    createdReport,
  };
}

export async function skipInspection(inspectionId, employeeId, notes) {
  const inspection = await getInspectionById(inspectionId);

  if (!inspection) {
    throw new Error("הביקורת לא נמצאה");
  }

  if (inspection.employee_id !== employeeId) {
    throw new Error("הביקורת אינה שייכת לעובד זה");
  }

  const { data, error } = await supabase
    .from("building_inspections")
    .update({
      status: "SKIPPED",
      notes: notes?.trim() || null,
      last_result: "NOT_COMPLETED",
    })
    .eq("id", inspectionId)
    .select()
    .single();

  if (error) {
    console.error("Error skipping inspection:", error.message);
    throw new Error("שגיאה בדילוג על ביקורת");
  }

  return data;
}