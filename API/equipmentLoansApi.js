// equipmentLoansApi.js
// API לניהול בקשות השאלה של ציוד

import { getSupabase } from "../DataBase/supabase";
import { createNotification } from "./notificationsApi";

/**
 * המרת תאריך לפורמט YYYY-MM-DD
 */
function normalizeDate(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * בדיקת תקינות בסיסית לטווח תאריכים
 */
export function validateLoanDates(startDate, endDate) {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  const today = normalizeDate(new Date());

  if (!start || !end) {
    throw new Error("יש לבחור תאריך התחלה ותאריך סיום.");
  }

  if (start < today) {
    throw new Error("לא ניתן לבחור תאריך התחלה שכבר עבר.");
  }

  if (end < start) {
    throw new Error("תאריך הסיום חייב להיות זהה או מאוחר מתאריך ההתחלה.");
  }

  const startObj = new Date(`${start}T00:00:00`);
  const endObj = new Date(`${end}T00:00:00`);
  const diffInDays = Math.round((endObj - startObj) / (1000 * 60 * 60 * 24)) + 1;

  if (diffInDays > 30) {
    throw new Error("לא ניתן לבקש השאלה ליותר מ-30 ימים.");
  }

  return {
    startDate: start,
    endDate: end,
  };
}

/**
 * בדיקה האם יש חפיפה עם השאלות מאושרות / ממתינות
 */
export async function checkEquipmentAvailability(equipmentId, startDate, endDate, excludeLoanId = null) {
  const supabase = getSupabase();

  const normalized = validateLoanDates(startDate, endDate);

  const { data: equipment, error: equipmentError } = await supabase
    .from("building_equipment")
    .select("id, is_available")
    .eq("id", equipmentId)
    .maybeSingle();

  if (equipmentError) {
    console.error("Error checking equipment status:", equipmentError);
    throw equipmentError;
  }

  if (!equipment) {
    throw new Error("הפריט לא נמצא במערכת.");
  }

  if (!equipment.is_available) {
    return {
      isAvailable: false,
      conflicts: [],
      reason: "הפריט כבר לא זמין להשאלה.",
    };
  }

  const { data, error } = await supabase
    .from("equipment_loans")
    .select("id, start_date, end_date, status")
    .eq("equipment_id", equipmentId)
    .in("status", ["pending", "approved"]);

  if (error) {
    console.error("Error checking equipment availability:", error);
    throw error;
  }

  const conflicts = (data || []).filter((loan) => {
    if (excludeLoanId && loan.id === excludeLoanId) {
      return false;
    }

    return !(
      normalized.endDate < loan.start_date ||
      normalized.startDate > loan.end_date
    );
  });

  return {
    isAvailable: conflicts.length === 0,
    conflicts,
    reason: conflicts.length > 0 ? "קיימת בקשה חופפת בטווח התאריכים שנבחר." : null,
  };
}

/**
 * יצירת בקשת השאלה חדשה
 */
export async function requestEquipmentLoan({
  buildingId,
  equipmentId,
  ownerId,
  borrowerId,
  startDate,
  endDate,
}) {
  const supabase = getSupabase();

  if (!buildingId || !equipmentId || !ownerId || !borrowerId) {
    throw new Error("חסרים נתונים לשליחת בקשת ההשאלה.");
  }

  if (ownerId === borrowerId) {
    throw new Error("לא ניתן להשאיל פריט שהעלית בעצמך.");
  }

  const normalized = validateLoanDates(startDate, endDate);

  const availability = await checkEquipmentAvailability(
    equipmentId,
    normalized.startDate,
    normalized.endDate
  );

  if (!availability.isAvailable) {
    throw new Error(availability.reason || "הציוד אינו זמין בטווח התאריכים שנבחר.");
  }

  const payload = {
    building_id: buildingId,
    equipment_id: equipmentId,
    owner_id: ownerId,
    borrower_id: borrowerId,
    start_date: normalized.startDate,
    end_date: normalized.endDate,
    status: "pending",
  };

  const { data, error } = await supabase
    .from("equipment_loans")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Error creating equipment loan request:", error);
    throw error;
  }

  await createNotification({
    recipient_id: ownerId,
    sender_id: borrowerId,
    title: "בקשת השאלה חדשה 📦",
    message: "דייר אחר שלח לך בקשה להשאלת ציוד. לחץ לצפייה בפרטים.",
    type: "equipment_loan_request",
    related_data: {
      loan_id: data.id,
      equipment_id: equipmentId,
      building_id: buildingId,
      owner_id: ownerId,
      borrower_id: borrowerId,
      start_date: normalized.startDate,
      end_date: normalized.endDate,
    },
  });

  return data;
}

/**
 * שליפת כל הבקשות שמשתמש מסוים שלח
 * כולל פרטי המשאיל, כדי שהמושאל יראה ממי הוא משאיל.
 */
export async function getMyBorrowRequests(borrowerId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("equipment_loans")
    .select(`
      id,
      building_id,
      equipment_id,
      owner_id,
      borrower_id,
      start_date,
      end_date,
      status,
      created_at,
      building_equipment (
        id,
        title,
        description,
        item_image_url,
        category_id
      )
    `)
    .eq("borrower_id", borrowerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching my borrow requests:", error);
    throw error;
  }

  const requests = data || [];
  const ownerIds = [...new Set(requests.map((item) => item.owner_id).filter(Boolean))];

  if (!ownerIds.length) {
    return requests;
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("auth_uid, first_name, last_name, email, phone")
    .in("auth_uid", ownerIds);

  if (profilesError) {
    console.warn("Could not fetch owner profiles:", profilesError);
    return requests;
  }

  const profilesMap = {};
  (profilesData || []).forEach((profile) => {
    profilesMap[profile.auth_uid] = profile;
  });

  return requests.map((request) => ({
    ...request,
    owner_profile: profilesMap[request.owner_id] || null,
  }));
}

/**
 * שליפת כל הבקשות שהגיעו אליי כבעל ציוד
 * כולל פרטי המבקש.
 */
export async function getIncomingLoanRequests(ownerId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("equipment_loans")
    .select(`
      id,
      building_id,
      equipment_id,
      owner_id,
      borrower_id,
      start_date,
      end_date,
      status,
      created_at,
      building_equipment (
        id,
        title,
        description,
        item_image_url,
        category_id
      )
    `)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching incoming loan requests:", error);
    throw error;
  }

  const requests = data || [];
  const borrowerIds = [...new Set(requests.map((item) => item.borrower_id).filter(Boolean))];

  if (!borrowerIds.length) {
    return requests;
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("auth_uid, first_name, last_name, email, phone")
    .in("auth_uid", borrowerIds);

  if (profilesError) {
    console.warn("Could not fetch borrower profiles:", profilesError);
    return requests;
  }

  const profilesMap = {};
  (profilesData || []).forEach((profile) => {
    profilesMap[profile.auth_uid] = profile;
  });

  return requests.map((request) => ({
    ...request,
    borrower_profile: profilesMap[request.borrower_id] || null,
  }));
}

/**
 * אישור בקשת השאלה
 * שינוי חשוב:
 * 1. מאשרים את הבקשה.
 * 2. מסמנים את הפריט כלא זמין.
 * 3. דוחים אוטומטית בקשות pending אחרות על אותו פריט, כדי למנוע כפילויות.
 */
export async function approveLoanRequest(loanId) {
  const supabase = getSupabase();

  const { data: loan, error: loanError } = await supabase
    .from("equipment_loans")
    .select("id, equipment_id, building_id, owner_id, borrower_id, start_date, end_date, status")
    .eq("id", loanId)
    .single();

  if (loanError) {
    console.error("Error fetching loan request before approval:", loanError);
    throw loanError;
  }

  if (loan.status !== "pending") {
    throw new Error("רק בקשה במצב ממתין ניתנת לאישור.");
  }

  const availability = await checkEquipmentAvailability(
    loan.equipment_id,
    loan.start_date,
    loan.end_date,
    loanId
  );

  if (!availability.isAvailable) {
    throw new Error(availability.reason || "לא ניתן לאשר את הבקשה כי הפריט אינו זמין.");
  }

  const { data: approvedLoan, error: approveError } = await supabase
    .from("equipment_loans")
    .update({ status: "approved" })
    .eq("id", loanId)
    .select()
    .single();

  if (approveError) {
    console.error("Error approving loan request:", approveError);
    throw approveError;
  }

  const { error: equipmentError } = await supabase
    .from("building_equipment")
    .update({ is_available: false })
    .eq("id", loan.equipment_id);

  if (equipmentError) {
    console.error("Error marking equipment unavailable:", equipmentError);
    throw equipmentError;
  }

  await supabase
    .from("equipment_loans")
    .update({ status: "rejected" })
    .eq("equipment_id", loan.equipment_id)
    .eq("status", "pending")
    .neq("id", loanId);

  await createNotification({
    recipient_id: loan.borrower_id,
    sender_id: loan.owner_id,
    title: "בקשת ההשאלה אושרה ✅",
    message: "בקשת ההשאלה שלך אושרה על ידי בעל הציוד.",
    type: "equipment_loan_approved",
    related_data: {
      loan_id: loan.id,
      equipment_id: loan.equipment_id,
      building_id: loan.building_id,
      owner_id: loan.owner_id,
      borrower_id: loan.borrower_id,
      start_date: loan.start_date,
      end_date: loan.end_date,
    },
  });

  return approvedLoan;
}

/**
 * דחיית בקשת השאלה
 */
export async function rejectLoanRequest(loanId) {
  const supabase = getSupabase();

  const { data: loan, error: loanError } = await supabase
    .from("equipment_loans")
    .select("id, equipment_id, building_id, owner_id, borrower_id, start_date, end_date, status")
    .eq("id", loanId)
    .single();

  if (loanError) {
    console.error("Error fetching loan request before rejection:", loanError);
    throw loanError;
  }

  if (loan.status !== "pending") {
    throw new Error("רק בקשה במצב ממתין ניתנת לדחייה.");
  }

  const { data, error } = await supabase
    .from("equipment_loans")
    .update({ status: "rejected" })
    .eq("id", loanId)
    .select()
    .single();

  if (error) {
    console.error("Error rejecting loan request:", error);
    throw error;
  }

  await createNotification({
    recipient_id: loan.borrower_id,
    sender_id: loan.owner_id,
    title: "בקשת ההשאלה נדחתה ❌",
    message: "בקשת ההשאלה שלך נדחתה על ידי בעל הציוד.",
    type: "equipment_loan_rejected",
    related_data: {
      loan_id: loan.id,
      equipment_id: loan.equipment_id,
      building_id: loan.building_id,
      owner_id: loan.owner_id,
      borrower_id: loan.borrower_id,
      start_date: loan.start_date,
      end_date: loan.end_date,
    },
  });

  return data;
}

/**
 * סימון ציוד כהוחזר
 * לאחר החזרה, הפריט חוזר להיות זמין בלוח ההשאלות.
 */
export async function markLoanAsReturned(loanId) {
  const supabase = getSupabase();

  const { data: loan, error: loanError } = await supabase
    .from("equipment_loans")
    .select("id, equipment_id, status")
    .eq("id", loanId)
    .single();

  if (loanError) {
    console.error("Error fetching loan before return:", loanError);
    throw loanError;
  }

  if (loan.status !== "approved") {
    throw new Error("ניתן לסמן כהוחזר רק בקשה שאושרה.");
  }

  const { data, error } = await supabase
    .from("equipment_loans")
    .update({ status: "returned" })
    .eq("id", loanId)
    .select()
    .single();

  if (error) {
    console.error("Error marking loan as returned:", error);
    throw error;
  }

  const { error: equipmentError } = await supabase
    .from("building_equipment")
    .update({ is_available: true })
    .eq("id", loan.equipment_id);

  if (equipmentError) {
    console.error("Error marking equipment available:", equipmentError);
    throw equipmentError;
  }

  return data;
}

/**
 * ביטול בקשת השאלה על ידי הלווה
 */
export async function cancelLoanRequest(loanId) {
  const supabase = getSupabase();

  const { data: loan, error: loanError } = await supabase
    .from("equipment_loans")
    .select("id, equipment_id, status")
    .eq("id", loanId)
    .single();

  if (loanError) {
    console.error("Error fetching loan before cancel:", loanError);
    throw loanError;
  }

  if (loan.status !== "pending") {
    throw new Error("ניתן לבטל רק בקשה שעדיין ממתינה לאישור.");
  }

  const { data, error } = await supabase
    .from("equipment_loans")
    .update({ status: "cancelled" })
    .eq("id", loanId)
    .select()
    .single();

  if (error) {
    console.error("Error cancelling equipment loan request:", error);
    throw error;
  }

  return data;
}

/**
 * שליפת קטגוריות מומלצות למשתמש לפי היסטוריית השאלות שלו
 */
export async function getRecommendedEquipmentCategories({
  buildingId,
  borrowerId,
  minBorrowCount = 3,
}) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("equipment_loans")
    .select(`
      id,
      status,
      building_equipment (
        category_id,
        equipment_categories (
          id,
          name,
          description,
          image_url,
          created_at
        )
      )
    `)
    .eq("building_id", buildingId)
    .eq("borrower_id", borrowerId)
    .in("status", ["approved", "returned"]);

  if (error) {
    console.error("Error fetching recommended equipment categories:", error);
    throw error;
  }

  const categoryMap = {};

  (data || []).forEach((loan) => {
    const equipment = loan.building_equipment;
    const category = equipment?.equipment_categories;

    if (!equipment?.category_id || !category?.id) {
      return;
    }

    if (!categoryMap[category.id]) {
      categoryMap[category.id] = {
        id: category.id,
        name: category.name,
        description: category.description,
        image_url: category.image_url,
        created_at: category.created_at,
        borrowCount: 0,
      };
    }

    categoryMap[category.id].borrowCount += 1;
  });

  return Object.values(categoryMap)
    .filter((category) => category.borrowCount >= minBorrowCount)
    .sort((a, b) => b.borrowCount - a.borrowCount);
}