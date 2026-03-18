// equipmentLoansApi.js
// API לניהול בקשות השאלה של ציוד

import { getSupabase } from "../DataBase/supabase";

/**
 * בדיקה האם יש חפיפה עם השאלות מאושרות / ממתינות
 */
export async function checkEquipmentAvailability(equipmentId, startDate, endDate) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("equipment_loans")
    .select("id, start_date, end_date, status")
    .eq("equipment_id", equipmentId)
    .in("status", ["pending", "approved"]);

  if (error) {
    console.error("Error checking equipment availability:", error);
    throw error;
  }

  const hasOverlap = (data || []).some((loan) => {
    return !(endDate < loan.start_date || startDate > loan.end_date);
  });

  return {
    isAvailable: !hasOverlap,
    conflicts: hasOverlap ? data : [],
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

  const availability = await checkEquipmentAvailability(equipmentId, startDate, endDate);

  if (!availability.isAvailable) {
    throw new Error("הציוד אינו זמין בטווח התאריכים שנבחר.");
  }

  const payload = {
    building_id: buildingId,
    equipment_id: equipmentId,
    owner_id: ownerId,
    borrower_id: borrowerId,
    start_date: startDate,
    end_date: endDate,
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

  return data;
}

/**
 * שליפת כל הבקשות שמשתמש מסוים שלח
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

  return data || [];
}

/**
 * שליפת כל הבקשות שהגיעו אליי כבעל ציוד
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

  return data || [];
}

/**
 * אישור בקשת השאלה
 */
export async function approveLoanRequest(loanId) {
  const supabase = getSupabase();

  const { data: loan, error: loanError } = await supabase
    .from("equipment_loans")
    .select("id, equipment_id, start_date, end_date, status")
    .eq("id", loanId)
    .single();

  if (loanError) {
    console.error("Error fetching loan request before approval:", loanError);
    throw loanError;
  }

  if (loan.status !== "pending") {
    throw new Error("רק בקשה במצב pending ניתנת לאישור.");
  }

  const availability = await checkEquipmentAvailability(
    loan.equipment_id,
    loan.start_date,
    loan.end_date
  );

  const realConflicts = (availability.conflicts || []).filter((item) => item.id !== loanId);

  if (realConflicts.length > 0) {
    throw new Error("לא ניתן לאשר את הבקשה כי נוצרה חפיפה עם בקשה אחרת.");
  }

  const { data, error } = await supabase
    .from("equipment_loans")
    .update({ status: "approved" })
    .eq("id", loanId)
    .select()
    .single();

  if (error) {
    console.error("Error approving loan request:", error);
    throw error;
  }

  return data;
}

/**
 * דחיית בקשת השאלה
 */
export async function rejectLoanRequest(loanId) {
  const supabase = getSupabase();

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

  return data;
}

/**
 * סימון ציוד כהוחזר
 */
export async function markLoanAsReturned(loanId) {
  const supabase = getSupabase();

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

  return data;
}

/**
 * ביטול בקשת השאלה על ידי הלווה
 */
export async function cancelLoanRequest(loanId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("equipment_loans")
    .update({ status: "cancelled" })
    .eq("id", loanId)
    .select()
    .single();

  if (error) {
    console.error("Error cancelling loan request:", error);
    throw error;
  }

  return data;
}


/**
 * שליפת קטגוריות מומלצות למשתמש לפי היסטוריית השאלות שלו
 * כלל עסקי:
 * - נספר רק השאלות בסטטוס approved / returned
 * - רק עבור אותו בניין
 * - רק קטגוריות עם minBorrowCount ומעלה ייחשבו כמומלצות
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