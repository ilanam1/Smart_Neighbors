// jobRequestsApi.js
// API לקריאות עבודה של נותני שירות + העלאת אסמכתאות

import { getSupabase } from "../DataBase/supabase";
import { createNotification } from "./notificationsApi";
import ReactNativeBlobUtil from "react-native-blob-util";
import { decode } from "base64-arraybuffer";

const JOB_COMPLETION_BUCKET = "job-completion-documents";

/* =========================================================
   פונקציות עזר
   ========================================================= */

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

async function uriToArrayBuffer(file) {
  if (!file?.uri) {
    throw new Error("לא נמצא נתיב לקובץ שנבחר");
  }

  try {
    const base64Data = await ReactNativeBlobUtil.fs.readFile(file.uri, "base64");

    if (!base64Data) {
      throw new Error("הקובץ שנבחר ריק או לא ניתן לקריאה");
    }

    return decode(base64Data);
  } catch (error) {
    console.error("Error reading local file as base64:", {
      message: error?.message,
      uri: file?.uri,
      name: file?.name,
      type: file?.type,
    });

    throw new Error(
      "לא ניתן לקרוא את הקובץ שנבחר מהמכשיר. נסה לבחור קובץ אחר או תמונה מהגלריה."
    );
  }
}

/**
 * בדיקה שעובד השירות קיים
 */
async function validateServiceEmployee(employeeId) {
  const supabase = getSupabase();

  if (!employeeId) {
    throw new Error("חסר מזהה עובד שירות");
  }

  const { data, error } = await supabase
    .from("service_employees")
    .select("id, full_name, phone, company_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    console.error("Error validating service employee:", error.message);
    throw new Error("שגיאה באימות נותן השירות");
  }

  if (!data) {
    throw new Error("נותן השירות לא נמצא במערכת");
  }

  return data;
}

/**
 * שליפת קריאת עבודה לפי מזהה
 */
async function getJobById(jobId) {
  const supabase = getSupabase();

  if (!jobId) {
    throw new Error("חסר מזהה קריאת עבודה");
  }

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
        auth_user_id,
        type,
        severity,
        description,
        location,
        status
      )
    `)
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching job by id:", error.message);
    throw new Error("שגיאה בשליפת קריאת העבודה");
  }

  if (!data) {
    throw new Error("קריאת העבודה לא נמצאה");
  }

  return data;
}

/**
 * מחזיר מזהה עובד בטוח.
 * אם המסך לא העביר employeeId, ננסה להשלים מתוך job.employee_id או מהטבלה.
 */
async function resolveEmployeeIdForJob(job, employeeId) {
  if (employeeId) {
    return employeeId;
  }

  if (job?.employee_id) {
    return job.employee_id;
  }

  if (job?.id) {
    const dbJob = await getJobById(job.id);
    return dbJob.employee_id;
  }

  throw new Error("חסר מזהה עובד שירות");
}

/**
 * בדיקה שהמשימה באמת שייכת לעובד הזה
 */
async function validateJobBelongsToEmployee(jobId, employeeId) {
  const job = await getJobById(jobId);

  if (job.employee_id !== employeeId) {
    throw new Error("קריאת העבודה אינה משויכת לנותן השירות המחובר");
  }

  return job;
}

/* =========================================================
   יצירת קריאת עבודה על ידי ועד/מנהל
   ========================================================= */

export async function createJobRequest({
  reportId,
  employeeId,
  instructions,
  scheduleTime,
}) {
  const supabase = getSupabase();
  const { user, profile } = await getCurrentUserWithBuilding();

  await validateServiceEmployee(employeeId);

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

      // זה התיקון החשוב ביותר עבור העלאת אסמכתא
      employee_id: employeeId,

      tenant_id: reportData?.auth_user_id,
      report_type: reportData?.type,
      building_id: profile.building_id,
      building_name: profile.buildings?.name,
      manager_uid: user.id,
      manager_name: profile.first_name || "נציג ועד",
      instructions: instructions || "אין תיאור",
      schedule_time: scheduleTime || "בהקדם אפשרי",
    },
  });

  return job;
}

/* =========================================================
   שליפות עבור ועד הבית
   ========================================================= */

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

/* =========================================================
   שליפות עבור נותן שירות
   ========================================================= */

export async function getEmployeeOpenJobs(employeeId) {
  const supabase = getSupabase();

  await validateServiceEmployee(employeeId);

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
    .in("status", ["PENDING", "ACCEPTED"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching employee jobs:", error.message);
    throw new Error("שגיאה בשליפת בקשות פתוחות");
  }

  return data || [];
}

export async function getEmployeeCompletedJobs(employeeId) {
  const supabase = getSupabase();

  await validateServiceEmployee(employeeId);

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
    throw new Error("שגיאה בשליפת היסטוריית המשימות");
  }

  return data || [];
}

/* =========================================================
   העלאת אסמכתא
   ========================================================= */

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

  const resolvedEmployeeId = await resolveEmployeeIdForJob(job, employeeId);
  const fullJob = await validateJobBelongsToEmployee(job.id, resolvedEmployeeId);

  if (!file?.uri) {
    throw new Error("לא נבחר קובץ להעלאה");
  }

  const originalName = file.name || "repair-proof";
  const safeName = sanitizeFileName(originalName);
  const extension = getFileExtension(safeName);

  const filePath = [
    "jobs",
    String(fullJob.id),
    `${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`,
  ].join("/");

  const fileArrayBuffer = await uriToArrayBuffer(file);

  const { error: uploadError } = await supabase.storage
    .from(JOB_COMPLETION_BUCKET)
    .upload(filePath, fileArrayBuffer, {
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
        job_id: fullJob.id,
        report_id: fullJob.report_id || null,
        employee_id: resolvedEmployeeId,
        building_id: fullJob.building_id || null,
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

/* =========================================================
   סיום / דחייה של קריאת עבודה
   ========================================================= */

export async function markJobAsDone(
  jobId,
  reportId,
  committeeUid,
  employeeName,
  tenantId,
  reportType,
  employeeId = null
) {
  const supabase = getSupabase();

  let fullJob = null;

  if (employeeId) {
    fullJob = await validateJobBelongsToEmployee(jobId, employeeId);
  } else {
    fullJob = await getJobById(jobId);
  }

  const { error } = await supabase
    .from("employee_job_requests")
    .update({
      status: "DONE",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("employee_id", fullJob.employee_id);

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

  if (committeeUid) {
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
        employee_id: fullJob.employee_id,
        has_completion_document: true,
      },
    });
  }

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

  const resolvedEmployeeId = await resolveEmployeeIdForJob(job, employeeId);
  const fullJob = await validateJobBelongsToEmployee(job.id, resolvedEmployeeId);

  await uploadJobCompletionDocument({
    job: fullJob,
    employeeId: resolvedEmployeeId,
    file,
    documentType,
    note,
  });

  return await markJobAsDone(
    fullJob.id,
    fullJob.report_id,
    committeeUid || fullJob.manager_uid,
    employeeName,
    tenantId,
    reportType,
    resolvedEmployeeId
  );
}

export async function rejectJob(jobId, committeeUid, employeeName, employeeId = null) {
  const supabase = getSupabase();

  let fullJob = null;

  if (employeeId) {
    fullJob = await validateJobBelongsToEmployee(jobId, employeeId);
  } else {
    fullJob = await getJobById(jobId);
  }

  const { error } = await supabase
    .from("employee_job_requests")
    .update({
      status: "REJECTED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("employee_id", fullJob.employee_id);

  if (error) {
    throw new Error("שגיאה בדחיית הקריאה");
  }

  if (committeeUid) {
    await createNotification({
      recipient_id: committeeUid,
      sender_id: "system",
      title: "קריאת השירות נדחתה ❌",
      message: `נותן השירות ${
        employeeName || ""
      } ציין כי אינו יכול לטפל במטרד. אנא הקצה ספק אחר.`,
      type: "general",
      related_data: {
        job_id: jobId,
        employee_id: fullJob.employee_id,
      },
    });
  }

  return true;
}

/* =========================================================
   אסמכתאות
   ========================================================= */

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

/* =========================================================
   דוח חודשי
   ========================================================= */

export async function getEmployeeMonthlyReport(employeeId, year, month) {
  const supabase = getSupabase();

  await validateServiceEmployee(employeeId);

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