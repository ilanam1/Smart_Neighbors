import { getSupabase } from "../DataBase/supabase";

const supabase = getSupabase();

async function validateServiceEmployee(employeeId) {
  if (!employeeId) {
    throw new Error("לא התקבל מזהה עובד שירות");
  }

  const { data, error } = await supabase
    .from("service_employees")
    .select(
      `
      id,
      company_id,
      employee_number,
      full_name,
      phone,
      service_companies (
        id,
        name,
        service_type
      )
    `
    )
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching service employee:", error.message);
    throw new Error("שגיאה בשליפת פרטי עובד השירות");
  }

  if (!data) {
    throw new Error("עובד השירות לא נמצא במערכת");
  }

  if (!data.company_id) {
    throw new Error("עובד השירות אינו משויך לחברת ניהול");
  }

  return data;
}

export async function getServiceEmployeeBuildingLoadPredictions(employeeId) {
  await validateServiceEmployee(employeeId);

  const { data, error } = await supabase
    .from("building_maintenance_load_predictions")
    .select(
      `
      id,
      building_id,
      prediction_date,
      target_week_start,
      target_week_end,
      total_load_score,
      load_level,
      expected_issue_types,
      high_risk_count,
      medium_risk_count,
      predicted_issues_count,
      estimated_staff_members,
      explanation,
      recommended_staffing_action,
      model_name,
      model_version,
      created_at,
      buildings (
        id,
        name,
        address,
        city
      )
    `
    )
    .order("target_week_start", { ascending: false })
    .order("total_load_score", { ascending: false });

  if (error) {
    console.error("Error fetching building load predictions:", error.message);
    throw new Error("שגיאה בשליפת תחזית עומסי הבניינים");
  }

  if (!data || !data.length) {
    return [];
  }

  const latestWeek = data[0].target_week_start;

  return data
    .filter((item) => item.target_week_start === latestWeek)
    .sort((a, b) => Number(b.total_load_score) - Number(a.total_load_score));
}

export async function getServiceEmployeeLoadSummary(employeeId) {
  const predictions = await getServiceEmployeeBuildingLoadPredictions(employeeId);

  const totalBuildings = predictions.length;

  const highLoadBuildings = predictions.filter(
    (item) => item.load_level === "HIGH"
  ).length;

  const mediumLoadBuildings = predictions.filter(
    (item) => item.load_level === "MEDIUM"
  ).length;

  const lowLoadBuildings = predictions.filter(
    (item) => item.load_level === "LOW"
  ).length;

  const totalEstimatedStaff = predictions.reduce(
    (sum, item) => sum + Number(item.estimated_staff_members || 0),
    0
  );

  return {
    predictions,
    summary: {
      totalBuildings,
      highLoadBuildings,
      mediumLoadBuildings,
      lowLoadBuildings,
      totalEstimatedStaff,
    },
  };
}