// serviceProvidersApi.js
import { getSupabase } from "../DataBase/supabase";

const supabase = getSupabase();

async function getCurrentUserWithBuilding() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    // Check if it's an admin or employee from custom state (they might not have auth user if we are not using standard auth)
    // Actually, Admin/Committee uses standard Auth for Committee. System Admin uses admin table.
    // If it's committee, they do have auth user. 
    console.error("Error fetching current user:", userError?.message);
    throw new Error("שגיאה בזיהוי המשתמש המחובר");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("building_id")
    .eq("auth_uid", user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.building_id) {
    throw new Error("למשתמש המחובר עדיין לא משויך בניין");
  }

  return { user, buildingId: profile.building_id };
}

export async function listCompanies() {
  const { data, error } = await supabase
    .from("service_companies")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error listing companies:", error.message);
    throw new Error("שגיאה בשליפת חברות");
  }
  return data || [];
}

export async function listEmployeesByCompany(companyId) {
  const { data, error } = await supabase
    .from("service_employees")
    .select("id, full_name, phone")
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching company employees:", error.message);
    throw new Error("שגיאה בשליפת עובדי החברה");
  }
  return data || [];
}

export async function assignEmployeeToBuilding(employeeId) {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { error } = await supabase
    .from("employee_buildings")
    .insert([{ employee_id: employeeId, building_id: buildingId }]);

  if (error) {
    if (error.code === '23505') {
      throw new Error("העובד כבר משויך לבניין זה");
    }
    console.error("Error assigning employee:", error.message);
    throw new Error("שגיאה בשיוך העובד לבניין");
  }
  return true;
}

export async function listProviders() {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from("employee_buildings")
    .select(`
      employee_id,
      service_employees (
        id,
        full_name,
        phone,
        service_companies (
          id,
          name,
          service_type
        )
      )
    `)
    .eq("building_id", buildingId);

  if (error) {
    console.error("Error listing employees:", error.message);
    throw new Error("שגיאה בשליפת עובדים");
  }

  // Format the data to match the old listProviders format
  return (data || []).map(row => {
    const emp = row.service_employees;
    return {
      id: emp.id,
      name: emp.full_name,
      phone: emp.phone,
      employee_number: emp.phone, // using phone as identifier map
      category: emp.service_companies?.service_type || 'GENERAL',
      company_name: emp.service_companies?.name,
      company_id: emp.service_companies?.id,
      is_active: true
    };
  });
}

export async function createProvider({ name, phone, password, company_id }) {
  const { buildingId } = await getCurrentUserWithBuilding();

  // employee_number will be the phone number
  const employee_number = phone;

  // 1. Try to insert employee or get existing
  let { data: emp, error: createError } = await supabase
    .from("service_employees")
    .insert([{
      company_id,
      employee_number, // Unique login ID
      password,
      full_name: name,
      phone
    }])
    .select()
    .maybeSingle();

  if (createError) {
    if (createError.code === '23505') {
      throw new Error("מספר טלפון זה כבר רשום במערכת כעובד. אנא בחר באופציית 'שיוך עובד קיים'.");
    } else {
      console.error("Error creating employee:", createError.message);
      throw new Error("שגיאה ביצירת עובד.");
    }
  }

  // 2. Link employee to building
  const { error: linkError } = await supabase
    .from("employee_buildings")
    .insert([{
      employee_id: emp.id,
      building_id: buildingId
    }]);

  // It might already be linked, ignore duplicate error
  if (linkError && linkError.code !== '23505') {
    console.error("Error linking employee to building:", linkError.message);
    throw new Error("שגיאה בשיוך העובד לבניין");
  }

  return emp;
}

export async function updateProvider(id, patch) {
  throw new Error("לא ניתן לערוך פרטי עובד גלובאלי (שיוצרו על ידי ועד שונה). אם העובד הוחלף, מחק אותו מהבניין וצרף מחדש.");
}

export async function deleteProvider(id) {
  const { buildingId } = await getCurrentUserWithBuilding();

  // Delete only the relation for this building
  const { error } = await supabase
    .from("employee_buildings")
    .delete()
    .eq("employee_id", id)
    .eq("building_id", buildingId);

  if (error) {
    console.error("Error removing employee from building:", error.message);
    throw new Error("שגיאה בהסרת עובד מהבניין");
  }

  return true;
}

export async function getEmployeeBuildings(employeeId) {
  const { data, error } = await supabase
    .from("employee_buildings")
    .select(`
      building_id,
      buildings (
        id,
        name,
        address,
        city
      )
    `)
    .eq("employee_id", employeeId);

  if (error) {
    console.error("Error fetching employee buildings:", error.message);
    throw new Error("שגיאה בשליפת בנייני העובד");
  }

  // extract the buildings array
  return (data || []).map(row => row.buildings).filter(b => b != null);
}