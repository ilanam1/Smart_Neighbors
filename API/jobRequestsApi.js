import { getSupabase } from "../DataBase/supabase";
import { createNotification } from "./notificationsApi";

const JOB_COMPLETION_BUCKET = "job-completion-documents";

async function getCurrentUserWithBuilding() {
  const supabase = getSupabase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("שגיאה בזיהוי המשתמש המחובר");
  }

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

function sanitizeFileName(fileName = "document") {
  return String(fileName)
    .replace(/[^\w.\-א-ת ]/g, "_")
    .replace(/\s+/g, "_");
}

function getFileExtension(fileName = "") {
  const parts = String(fileName).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "file";
}

async function uriToBlob(uri) {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error("לא ניתן לקרוא את הקובץ שנבחר");
  }

  return await response.blob();
}

export async function createJobRequest({
  reportId,
  employeeId,
  instructions,
  scheduleTime,
}) {
  const supabase = getSupabase();
  const { user, profile } = await getCurrentUserWithBuilding();

  const { data: reportData } = await supabase
    .from("disturbance_reports")
    .select("auth_user_id, type")
    .eq("id", reportId)
    .single();

  const { data: job, error } = await supabase
    .from("employee_job_requests")
    .insert([
      {
        report_id: reportId,
        employee_id: employeeId,
        building_id: profile.building_id,
        manager_uid: user.id,
        instructions: instructions || "אין תיאור",
        schedule_time: scheduleTime || "בהקדם אפשרי",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating job request:", error.message);
    throw new Error("שגיאה ביצירת קריאת עבודה לעובד");
  }

  await supabase
    .from("disturbance_reports")
    .update({ status: "IN_PROGRESS" })
    .eq("id", reportId);

  await createNotification({
    recipient_id: employeeId,
    sender_id: user.id,
    title: "קריאת שירות חדשה 🛠️",
    message: `נפתחה עבורך קריאת שירות בבניין ${
      profile.buildings?.name || ""
    }. לחץ לצפייה בפרטים ובעדכון הסטטוס.`,
    type: "job_request",
    related_data: {
      job_id: job.id,
      report_id: reportId,
      tenant_id: reportData?.auth_user_id,
      report_type: reportData?.type,
      building_id: profile.building_id,
      building_name: profile.buildings?.name,
      manager_name: profile.first_name || "נציג ועד",
      instructions,
      schedule_time: scheduleTime,
    },
  });

  return job;
}

export async function getJobsForReport(reportId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("employee_job_requests")
    .select(`
      *,
      service_employees (
        id,
        full_name,
        phone
      ),
      job_completion_documents (
        id,
        file_name,
        file_type,
        file_size,
        file_path,
        document_type,
        note,
        uploaded_at
      )
    `)
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching jobs:", error.message);
    return [];
  }

  return data || [];
}

export async function getEmployeeOpenJobs(employeeId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("employee_job_requests")
    .select(`
      *,
      buildings (
        id,
        name,
        address,
        city
      ),
      disturbance_reports (
        id,
        auth_user_id,
        type,
        severity,
        description,
        location,
        status
      )
    `)
    .eq("employee_id", employeeId)
    .in("status", ["PENDING", "ACCEPTED", "IN_PROGRESS"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching employee jobs:", error.message);
    return [];
  }

  return data || [];
}

export async function getEmployeeCompletedJobs(employeeId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("employee_job_requests")
    .select(`
      *,
      buildings (
        id,
        name,
        address,
        city
      ),
      job_completion_documents (
        id,
        file_name,
        file_type,
        file_size,
        file_path,
        document_type,
        note,
        uploaded_at
      )
    `)
    .eq("employee_id", employeeId)
    .in("status", ["DONE", "REJECTED"])
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching completed jobs:", error.message);
    return [];
  }

  return data || [];
}

export async function uploadJobCompletionDocument({
  job,
  employeeId,
  file,
  documentType = "REPAIR_PROOF",
  note = "",
}) {
  const supabase = getSupabase();

  if (!job?.id) {
    throw new Error("חסר מזהה קריאת עבודה");
  }

  if (!employeeId) {
    throw new Error("חסר מזהה עובד שירות");
  }

  if (!file?.uri) {
    throw new Error("לא נבחר קובץ להעלאה");
  }

  const originalName = file.name || "repair-proof";
  const safeName = sanitizeFileName(originalName);
  const extension = getFileExtension(safeName);

  const filePath = [
    "jobs",
    String(job.id),
    `${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`,
  ].join("/");

  const blob = await uriToBlob(file.uri);

  const { error: uploadError } = await supabase.storage
    .from(JOB_COMPLETION_BUCKET)
    .upload(filePath, blob, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading job document:", uploadError.message);
    throw new Error("שגיאה בהעלאת האסמכתא");
  }

  const { data: docData, error: insertError } = await supabase
    .from("job_completion_documents")
    .insert([
      {
        job_id: job.id,
        report_id: job.report_id || null,
        employee_id: employeeId,
        building_id: job.building_id || null,
        file_name: originalName,
        file_type: file.type || null,
        file_size: file.size || null,
        file_path: filePath,
        document_type: documentType,
        note: note || null,
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error("Error saving document metadata:", insertError.message);

    await supabase.storage
      .from(JOB_COMPLETION_BUCKET)
      .remove([filePath]);

    throw new Error("הקובץ עלה, אך שמירת פרטי האסמכתא נכשלה");
  }

  return docData;
}

export async function markJobAsDone(
  jobId,
  reportId,
  committeeUid,
  employeeName,
  tenantId,
  reportType
) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("employee_job_requests")
    .update({
      status: "DONE",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error("שגיאה בסגירת תהליך העבודה");
  }

  const { error: repError } = await supabase
    .from("disturbance_reports")
    .update({ status: "RESOLVED" })
    .eq("id", reportId);

  if (repError) {
    throw new Error("שגיאה בסגירת התקלה במערכת");
  }

  await createNotification({
    recipient_id: committeeUid,
    sender_id: "system",
    title: "קריאת השירות טופלה! ✅",
    message: `נותן השירות ${
      employeeName || ""
    } ציין כי המטרד טופל בהצלחה ונשמרה אסמכתא לתיקון.`,
    type: "general",
    related_data: {
      job_id: jobId,
      report_id: reportId,
      has_completion_document: true,
    },
  });

  if (tenantId) {
    const reportTitle = reportType || "בבניין";

    await createNotification({
      recipient_id: tenantId,
      sender_id: "system",
      title: "המטרד שדיווחת טופל 🛠️",
      message: `רצינו לעדכן אותך שהמטרד ("${reportTitle}") טופל בהצלחה על ידי צוות התחזוקה. תודה על הדיווח!`,
      type: "general",
      related_data: { report_id: reportId },
    });
  }

  return true;
}

export async function markJobAsDoneWithDocument({
  job,
  employeeId,
  employeeName,
  committeeUid,
  tenantId,
  reportType,
  file,
  documentType = "REPAIR_PROOF",
  note = "",
}) {
  if (!job?.id) {
    throw new Error("לא התקבלה קריאת עבודה תקינה");
  }

  if (!file) {
    throw new Error("יש להעלות חשבונית או אסמכתא לפני סיום העבודה");
  }

  await uploadJobCompletionDocument({
    job,
    employeeId,
    file,
    documentType,
    note,
  });

  return await markJobAsDone(
    job.id,
    job.report_id,
    committeeUid,
    employeeName,
    tenantId,
    reportType
  );
}

export async function rejectJob(jobId, committeeUid, employeeName) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("employee_job_requests")
    .update({
      status: "REJECTED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error("שגיאה בדחיית הקריאה");
  }

  await createNotification({
    recipient_id: committeeUid,
    sender_id: "system",
    title: "קריאת השירות נדחתה ❌",
    message: `נותן השירות ${
      employeeName || ""
    } ציין כי אינו יכול לטפל במטרד. אנא הקצה ספק אחר.`,
    type: "general",
    related_data: { job_id: jobId },
  });

  return true;
}

export async function getJobCompletionDocuments(jobId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("job_completion_documents")
    .select("*")
    .eq("job_id", jobId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("Error fetching job completion documents:", error.message);
    return [];
  }

  return data || [];
}

export async function createJobCompletionDocumentSignedUrl(filePath) {
  const supabase = getSupabase();

  if (!filePath) {
    throw new Error("לא נמצא נתיב קובץ");
  }

  const { data, error } = await supabase.storage
    .from(JOB_COMPLETION_BUCKET)
    .createSignedUrl(filePath, 60 * 10);

  if (error) {
    console.error("Error creating signed url:", error.message);
    throw new Error("שגיאה בפתיחת האסמכתא");
  }

  return data?.signedUrl;
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
      ),
      job_completion_documents (
        id,
        file_name,
        file_type,
        file_size,
        file_path,
        document_type,
        note,
        uploaded_at
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