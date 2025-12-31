// disturbanceAssignmentsApi.js
import { getSupabase } from "../DataBase/supabase";

export async function getAssignmentsForReport(reportId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("disturbance_assignments")
    .select(`
      id,
      report_id,
      provider_id,
      status,
      created_at,
      updated_at,
      last_update_note,
      service_providers ( id, name, phone, category )
    `)
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAssignment({ reportId, providerId, note }) {
  const supabase = getSupabase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("אין משתמש מחובר");

  const { data, error } = await supabase
    .from("disturbance_assignments")
    .insert([
      {
        report_id: reportId,
        provider_id: providerId,
        status: "REQUESTED",
        created_by: user.id,
        last_update_note: note || null,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateAssignmentStatus(assignmentId, { status, note }) {
  const supabase = getSupabase();

  const patch = {
    status,
    last_update_note: note || null,
  };

  const { data, error } = await supabase
    .from("disturbance_assignments")
    .update(patch)
    .eq("id", assignmentId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
