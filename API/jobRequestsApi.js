import { getSupabase } from "../DataBase/supabase";
import { createNotification } from "./notificationsApi";

async function getCurrentUserWithBuilding() {
  const supabase = getSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("שגיאה בזיהוי המשתמש המחובר");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("building_id, first_name, buildings(name)")
    .eq("auth_uid", user.id)
    .single();

  if (profileError || !profile || !profile.building_id) {
    throw new Error("למשתמש המחובר עדיין לא משויך בניין");
  }

  return { user, profile };
}

export async function createJobRequest({ reportId, employeeId, instructions, scheduleTime }) {
  const supabase = getSupabase();
  const { user, profile } = await getCurrentUserWithBuilding();

  const { data: reportData } = await supabase
    .from("disturbance_reports")
    .select("auth_user_id, type")
    .eq("id", reportId)
    .single();

  const { data: job, error } = await supabase
    .from("employee_job_requests")
    .insert([{
      report_id: reportId,
      employee_id: employeeId,
      building_id: profile.building_id,
      manager_uid: user.id,
      instructions: instructions || "אין תיאור",
      schedule_time: scheduleTime || "בהקדם אפשרי"
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating job request:", error.message);
    throw new Error("שגיאה ביצירת קריאת עבודה לעובד");
  }

  // Update disturbance report to IN_PROGRESS
  await supabase
    .from("disturbance_reports")
    .update({ status: 'IN_PROGRESS' })
    .eq("id", reportId);

  // Send Notification to Employee
  await createNotification({
    recipient_id: employeeId,
    sender_id: user.id,
    title: "קריאת שירות חדשה 🛠️",
    message: `נפתחה עבורך קריאת שירות בבניין ${profile.buildings?.name || ''}. לחץ לצפייה בפרטים ובעדכון הסטטוס.`,
    type: "job_request",
    related_data: {
      job_id: job.id,
      report_id: reportId,
      tenant_id: reportData?.auth_user_id,
      report_type: reportData?.type,
      building_id: profile.building_id,
      building_name: profile.buildings?.name,
      manager_name: profile.first_name || 'נציג ועד',
      instructions,
      schedule_time: scheduleTime
    }
  });

  return job;
}

export async function getJobsForReport(reportId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("employee_job_requests")
    .select(`
      *,
      service_employees ( id, full_name, phone )
    `)
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching jobs:", error.message);
    return [];
  }
  return data;
}

export async function getEmployeeOpenJobs(employeeId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("employee_job_requests")
    .select(`
      *,
      buildings (name)
    `)
    .eq("employee_id", employeeId)
    .in("status", ["PENDING", "ACCEPTED", "IN_PROGRESS"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching employee jobs:", error.message);
    return [];
  }
  return data;
}

export async function getEmployeeCompletedJobs(employeeId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("employee_job_requests")
    .select(`
      *,
      buildings (name)
    `)
    .eq("employee_id", employeeId)
    .in("status", ["DONE", "REJECTED"])
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching completed jobs:", error.message);
    return [];
  }
  return data;
}

export async function markJobAsDone(jobId, reportId, committeeUid, employeeName, tenantId, reportType) {
  const supabase = getSupabase();
  
  // Mark job DONE
  const { error } = await supabase
    .from("employee_job_requests")
    .update({ status: 'DONE' })
    .eq("id", jobId);

  if (error) throw new Error("שגיאה בסגירת תהליך העבודה");

  // Mark disturbance report RESOLVED
  const { error: repError } = await supabase
    .from("disturbance_reports")
    .update({ status: 'RESOLVED' })
    .eq("id", reportId);
  
  if (repError) throw new Error("שגיאה בסגירת התקלה במערכת");

  // Send notification to committee
  await createNotification({
    recipient_id: committeeUid,
    sender_id: 'system',
    title: "קריאת השירות טופלה! ✅",
    message: `נותן השירות ${employeeName || ''} ציין כי המטרד טופל בהצלחה.`,
    type: "general",
    related_data: { job_id: jobId }
  });

  // Send notification to the tenant who opened it
  if (tenantId) {
    const reportTitle = reportType || 'בבניין';
    await createNotification({
      recipient_id: tenantId,
      sender_id: 'system',
      title: "המטרד שדיווחת טופל 🛠️",
      message: `רצינו לעדכן אותך שהמטרד ("${reportTitle}") טופל בהצלחה על ידי צוות התחזוקה. תודה על הדיווח!`,
      type: "general",
      related_data: { report_id: reportId }
    });
  }

  return true;
}

export async function rejectJob(jobId, committeeUid, employeeName) {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from("employee_job_requests")
    .update({ status: 'REJECTED' })
    .eq("id", jobId);

  if (error) throw new Error("שגיאה בדחיית הקריאה");

  await createNotification({
    recipient_id: committeeUid,
    sender_id: 'system',
    title: "קריאת השירות נדחתה ❌",
    message: `נותן השירות ${employeeName || ''} ציין כי אינו יכול לטפל במטרד. אנא הקצה ספק אחר.`,
    type: "general",
    related_data: { job_id: jobId }
  });

  return true;
}



export async function getEmployeeMonthlyReport(employeeId, year, month) {
  const supabase = getSupabase();

  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 1, 0, 0, 0, 0);

  const { data, error } = await supabase
    .from("employee_job_requests")
    .select(`
      id,
      report_id,
      employee_id,
      building_id,
      manager_uid,
      instructions,
      schedule_time,
      status,
      created_at,
      updated_at,
      buildings (
        id,
        name,
        address,
        city
      ),
      disturbance_reports (
        id,
        type,
        severity,
        description,
        location,
        status,
        created_at,
        occurred_at
      )
    `)
    .eq("employee_id", employeeId)
    .gte("created_at", startDate.toISOString())
    .lt("created_at", endDate.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching monthly report:", error.message);
    throw new Error("שגיאה בשליפת הדוח החודשי");
  }

  return data || [];
}