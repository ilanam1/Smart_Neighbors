import { getSupabase } from "../DataBase/supabase";
import { assignEmployeeToBuilding } from "./serviceProvidersApi";

export async function createNotification({ recipient_id, sender_id, title, message, type, related_data }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_notifications")
    .insert([{
      recipient_id,
      sender_id,
      title,
      message,
      type,
      related_data
    }]);

  if (error) {
    console.error("Error creating notification:", error.message);
    throw new Error("שגיאה ביצירת התראה");
  }
  return true;
}

export async function getMyNotifications(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error.message);
    throw new Error("שגיאה בשליפת התראות");
  }
  return data || [];
}

export async function markNotificationAsRead(notificationId) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("app_notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification read:", error.message);
  }
}

export async function markAllNotificationsAsRead(userId) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("app_notifications")
    .update({ is_read: true })
    .eq("recipient_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking all notifications read:", error.message);
  }
}

// -------------------------
// Workflows:

export async function requestEmployeeAssignment(employeeId, buildingId, senderAuthUid, buildingName, committeeName) {
  // Check if there is already a pending request
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("app_notifications")
    .select("*")
    .eq("recipient_id", employeeId)
    .eq("type", "assignment_request")
    .eq("related_data->>building_id", buildingId)
    .eq("is_read", false);

  if (existing && existing.length > 0) {
    throw new Error("כבר נשלחה בקשת השתייכות לעובד זה עבור בניין זה והיא ממתינה לאישור.");
  }

  return createNotification({
    recipient_id: employeeId,
    sender_id: senderAuthUid,
    title: "בקשת שיוך חדשה 🏢",
    message: `ועד הבית בבניין ${buildingName} (${committeeName || 'נציג'}) מבקש לשייך אותך אליו.`,
    type: "assignment_request",
    related_data: {
      building_id: buildingId,
      building_name: buildingName,
      employee_id: employeeId,
      committee_uid: senderAuthUid
    }
  });
}

export async function requestEmployeeAssignmentSelf(employeeId) {
  const supabase = getSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("שגיאה בזיהוי מזהה משתמש");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, building_id, buildings(name)")
    .eq("auth_uid", user.id)
    .single();
    
  if (profileError || !profile) throw new Error("שגיאה בשליפת פרופיל משתמש");

  return requestEmployeeAssignment(
     employeeId, 
     profile.building_id, 
     user.id, 
     profile.buildings?.name || 'הבניין שלך', 
     profile.first_name || 'נציג ועד'
  );
}

export async function respondToAssignmentRequest(notification, isAccepted, reasonMessage = "") {
  // Update original notification as read and handled
  const supabase = getSupabase();
  await supabase
    .from("app_notifications")
    .update({ 
        is_read: true,
        related_data: { ...(notification.related_data || {}), is_handled: true }
    })
    .eq("id", notification.id);

  const { building_id, building_name, employee_id, committee_uid } = notification.related_data;

  // 1. If accepted, do the actual assignment
  if (isAccepted) {
    try {
      // Note: assignEmployeeToBuilding currently relies on getCurrentUserWithBuilding which assumes the caller is the committee!
      // Here, the caller is the employee! So we need to insert manually or change assignEmployeeToBuilding.
      const supabase = getSupabase();
      const { error: assignError } = await supabase
        .from("employee_buildings")
        .insert([{ employee_id: employee_id, building_id: building_id }]);

      if (assignError && assignError.code !== '23505') {
        throw new Error("שגיאה בביצוע השיוך בפועל במסד הנתונים");
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  // 2. Send notification back to committee_uid
  const title = isAccepted ? "בקשת השיוך אושרה! 🎉" : "בקשת השיוך סורבה ❌";
  const replyMessage = reasonMessage 
    ? `כותב/ת: "${reasonMessage}"`
    : (isAccepted ? `נותן השירות אישר את השיוך כעת והוא יכול לקבל לבניין שלך.` : `נותן השירות סירב לבקשתך ולא שויך לבניין.`);

  await createNotification({
    recipient_id: committee_uid,
    sender_id: employee_id,
    title: title,
    message: replyMessage,
    type: isAccepted ? "assignment_accepted" : "assignment_rejected",
    related_data: {
      building_id,
      employee_id,
      notification_id: notification.id
    }
  });

  return true;
}


export async function createBuildingMaintenanceNotification({
  buildingId,
  senderId,
  title,
  message,
  relatedData = {},
  excludeUserId = null,
}) {
  const supabase = getSupabase();

  const { data: residents, error: residentsError } = await supabase
    .from("profiles")
    .select("auth_uid")
    .eq("building_id", buildingId);

  if (residentsError) {
    console.error("Error fetching building residents:", residentsError.message);
    throw new Error("שגיאה בשליפת דיירי הבניין");
  }

  const recipients = (residents || [])
    .map((resident) => resident.auth_uid)
    .filter(Boolean)
    .filter((uid) => uid !== excludeUserId);

  if (recipients.length === 0) {
    return true;
  }

  const rows = recipients.map((recipientId) => ({
    recipient_id: recipientId,
    sender_id: senderId,
    title,
    message,
    type: "maintenance_notice",
    related_data: relatedData,
  }));

  const { error } = await supabase
    .from("app_notifications")
    .insert(rows);

  if (error) {
    console.error("Error creating building maintenance notifications:", error.message);
    throw new Error("שגיאה ביצירת התראות תחזוקה לדיירים");
  }

  return true;
}


// -------------------------
// House Fee Notifications

export async function notifyCommitteeAboutCashPaymentRequest({
  committeeUserId,
  tenantUserId,
  tenantName,
  monthYear,
  amount,
  paymentId,
}) {
  return createNotification({
    recipient_id: committeeUserId,
    sender_id: tenantUserId,
    title: "בקשה לתשלום מזומן 💵",
    message: `${tenantName} ביקש לשלם במזומן עבור מיסי ועד לחודש ${monthYear} בסכום של ${amount} ₪.`,
    type: "house_fee_cash_request",
    related_data: {
      payment_id: paymentId,
      month_year: monthYear,
      amount,
      tenant_user_id: tenantUserId,
    },
  });
}

export async function notifyCommitteeAboutLinkPaymentCompleted({
  committeeUserId,
  tenantUserId,
  tenantName,
  monthYear,
  amount,
  paymentId,
  receiptCode,
}) {
  return createNotification({
    recipient_id: committeeUserId,
    sender_id: tenantUserId,
    title: "תשלום ועד הושלם ✅",
    message: `${tenantName} סימן שתשלום מיסי הוועד לחודש ${monthYear} הושלם דרך הלינק. סכום: ${amount} ₪.`,
    type: "house_fee_link_paid",
    related_data: {
      payment_id: paymentId,
      month_year: monthYear,
      amount,
      receipt_code: receiptCode || null,
      tenant_user_id: tenantUserId,
    },
  });
}
