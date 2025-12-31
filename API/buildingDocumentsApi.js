// buildingDocumentsApi.js
// API לניהול מסמכי בניין (טבלה + storage)

import { getSupabase } from "../DataBase/supabase";

/**
 * שליפת כל המסמכים של בניין.
 * אם אין לך עדיין building_id, אפשר לקרוא בלי פרמטר – ואז זה יחזיר את כולם.
 */
export async function getBuildingDocuments(buildingId = null) {
  const supabase = getSupabase();

  let query = supabase
    .from("building_documents")
    .select("id, title, file_path, created_at, uploaded_by")
    .order("created_at", { ascending: false });

  if (buildingId) {
    query = query.eq("building_id", buildingId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("שגיאה בשליפת מסמכי בניין:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * העלאת מסמך ל-Storage + יצירת רשומה בטבלה.
 *  - uri: הנתיב לקובץ בטלפון
 *  - name: שם הקובץ
 *  - type: MIME type (לדוגמה application/pdf)
 *  - title: כותרת שתוצג למשתמש
 */
export async function uploadBuildingDocument({
  uri,
  name,
  type,
  title,
  buildingId = null,
  userId,
}) {
  const supabase = getSupabase();

  // 1) הגדרת נתיב הקובץ בתוך ה-Bucket
  const fileExt = name.split(".").pop();
  const fileName = `${Date.now()}_${userId}.${fileExt}`;
  const folder = buildingId || "default";
  const filePath = `${folder}/${fileName}`;

  // אובייקט קובץ כפי ש-react-native-supabase מצפה
  const file = {
    uri,
    name: fileName,
    type: type || "application/octet-stream",
  };

  // 2) העלאה ל-Storage
  const { error: uploadError } = await supabase.storage
    .from("building_documents")
    .upload(filePath, file);

  if (uploadError) {
    console.error("שגיאה בהעלאת קובץ ל-Storage:", uploadError.message);
    throw uploadError;
  }

  // 3) יצירת רשומה בטבלת building_documents
  const { data, error: insertError } = await supabase
    .from("building_documents")
    .insert([
      {
        building_id: buildingId,
        title,
        file_path: filePath,
        uploaded_by: userId,
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error("שגיאה בהכנסת רשומת מסמך:", insertError.message);
    throw insertError;
  }

  return data;
}

/**
 * מחיקת מסמך לפי id מהטבלה.
 * (אם תרצה גם למחוק מה-Storage אפשר להוסיף שלב נוסף)
 */
export async function deleteBuildingDocument(docId) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("building_documents")
    .delete()
    .eq("id", docId);

  if (error) {
    console.error("שגיאה במחיקת מסמך:", error.message);
    throw error;
  }
}
