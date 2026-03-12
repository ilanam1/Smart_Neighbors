// API/buildingDocumentsApi.js
// API לניהול מסמכי בניין (table + storage)
// מותאם לעבודה לפי building_id של המשתמש המחובר

import { getSupabase } from "../DataBase/supabase";

const supabase = getSupabase();

/**
 * פונקציית עזר:
 * מביאה את המשתמש המחובר ואת ה-building_id שלו מתוך profiles
 */
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

  if (!profile) {
    throw new Error("לא נמצא פרופיל למשתמש המחובר");
  }

  if (!profile.building_id) {
    throw new Error("למשתמש המחובר עדיין לא משויך בניין");
  }

  return {
    user,
    buildingId: profile.building_id,
  };
}

/**
 * שליפת כל המסמכים של הבניין של המשתמש המחובר
 */
export async function getBuildingDocuments() {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from("building_documents")
    .select("id, title, file_path, created_at, uploaded_by, building_id")
    .eq("building_id", buildingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("שגיאה בשליפת מסמכי בניין:", error.message);
    throw new Error("שגיאה בשליפת מסמכי הבניין");
  }

  return data || [];
}

/**
 * העלאת מסמך ל-Storage + יצירת רשומה בטבלה
 * uri - הנתיב לקובץ במכשיר
 * name - שם הקובץ
 * type - MIME type
 * title - כותרת לתצוגה
 */
export async function uploadBuildingDocument({
  uri,
  name,
  type,
  title,
}) {
  const { user, buildingId } = await getCurrentUserWithBuilding();

  if (!uri || !name || !title) {
    throw new Error("חסרים פרטי קובץ להעלאה");
  }

  const fileExt = name.includes(".") ? name.split(".").pop() : "bin";
  const safeExt = fileExt || "bin";
  const fileName = `${Date.now()}_${user.id}.${safeExt}`;
  const filePath = `${buildingId}/${fileName}`;

  const file = {
    uri,
    name: fileName,
    type: type || "application/octet-stream",
  };

  // העלאה ל-storage
  const { error: uploadError } = await supabase.storage
    .from("building_documents")
    .upload(filePath, file);

  if (uploadError) {
    console.error("שגיאה בהעלאת קובץ ל-Storage:", uploadError.message);
    throw new Error("שגיאה בהעלאת הקובץ לאחסון");
  }

  // יצירת רשומה בטבלה
  const { data, error: insertError } = await supabase
    .from("building_documents")
    .insert([
      {
        building_id: buildingId,
        title,
        file_path: filePath,
        uploaded_by: user.id,
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error("שגיאה בהכנסת רשומת מסמך:", insertError.message);

    // ניסיון ניקוי אם ההעלאה ל-storage הצליחה אבל הכנסת הרשומה נכשלה
    await supabase.storage.from("building_documents").remove([filePath]);

    throw new Error("שגיאה בשמירת המסמך בבסיס הנתונים");
  }

  return data;
}

/**
 * קבלת URL ציבורי למסמך
 * עובד אם ה-bucket ציבורי
 */
export function getBuildingDocumentPublicUrl(filePath) {
  const { data } = supabase.storage
    .from("building_documents")
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
}

/**
 * מחיקת מסמך:
 * 1. בודקת שהמסמך שייך לבניין של המשתמש
 * 2. מוחקת מה-storage
 * 3. מוחקת מהטבלה
 */
export async function deleteBuildingDocument(docId) {
  const { buildingId } = await getCurrentUserWithBuilding();

  // קודם מביאים את המסמך כדי לוודא שהוא שייך לבניין של המשתמש
  const { data: doc, error: fetchError } = await supabase
    .from("building_documents")
    .select("id, file_path, building_id")
    .eq("id", docId)
    .eq("building_id", buildingId)
    .maybeSingle();

  if (fetchError) {
    console.error("שגיאה בשליפת מסמך למחיקה:", fetchError.message);
    throw new Error("שגיאה באיתור המסמך למחיקה");
  }

  if (!doc) {
    throw new Error("המסמך לא נמצא או שאינו שייך לבניין שלך");
  }

  // מחיקה מה-storage
  if (doc.file_path) {
    const { error: storageError } = await supabase.storage
      .from("building_documents")
      .remove([doc.file_path]);

    if (storageError) {
      console.error("שגיאה במחיקת קובץ מה-Storage:", storageError.message);
      throw new Error("שגיאה במחיקת הקובץ מהאחסון");
    }
  }

  // מחיקה מהטבלה
  const { error: deleteError } = await supabase
    .from("building_documents")
    .delete()
    .eq("id", docId)
    .eq("building_id", buildingId);

  if (deleteError) {
    console.error("שגיאה במחיקת מסמך מהטבלה:", deleteError.message);
    throw new Error("שגיאה במחיקת המסמך");
  }
}