// buildingEquipmentApi.js
// API לניהול ציוד להשאלה לפי בניין

import { getSupabase } from "../DataBase/supabase";

const EQUIPMENT_IMAGES_BUCKET = "equipment-images";

/* =========================================================
   פונקציות עזר כלליות
   ========================================================= */

/**
 * בניית שם קובץ ייחודי ובטוח לתמונה ב-Supabase Storage
 */
function buildEquipmentImagePath({ buildingId, ownerId, fileName }) {
  const extensionFromFile = fileName?.split(".")?.pop()?.toLowerCase();
  const extension = extensionFromFile?.replace(/[^a-z0-9]/gi, "") || "jpg";

  return `${buildingId}/${ownerId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;
}

/**
 * ניקוי ערך טקסטואלי
 */
function cleanText(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

/**
 * שליפת פרופילים לפי auth_uid והחזרה כמפה
 */
async function getProfilesMapByAuthIds(authIds = []) {
  const supabase = getSupabase();

  const uniqueIds = [...new Set(authIds.filter(Boolean))];

  if (!uniqueIds.length) {
    return {};
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("auth_uid, first_name, last_name, email, phone, photo_url")
    .in("auth_uid", uniqueIds);

  if (error) {
    console.warn("Could not fetch profiles map:", error);
    return {};
  }

  const profilesMap = {};

  (data || []).forEach((profile) => {
    profilesMap[profile.auth_uid] = profile;
  });

  return profilesMap;
}

/**
 * הוספת owner_profile לפריטי ציוד
 */
async function attachOwnerProfiles(items = []) {
  const ownerIds = items.map((item) => item.owner_id).filter(Boolean);
  const profilesMap = await getProfilesMapByAuthIds(ownerIds);

  return items.map((item) => ({
    ...item,
    owner_profile: profilesMap[item.owner_id] || null,
  }));
}

/* =========================================================
   העלאת תמונה ידנית
   ========================================================= */

/**
 * העלאת תמונת ציוד ל-Supabase Storage
 *
 * חשוב:
 * צריך Bucket בשם equipment-images.
 * מומלץ שהוא יהיה Public כדי שהתמונה תוצג ישירות באפליקציה.
 */
export async function uploadEquipmentImageFromUri({
  imageUri,
  fileName,
  mimeType,
  buildingId,
  ownerId,
}) {
  if (!imageUri) {
    return null;
  }

  if (!buildingId || !ownerId) {
    throw new Error("חסרים נתוני בניין או משתמש לצורך העלאת התמונה.");
  }

  const supabase = getSupabase();

  const filePath = buildEquipmentImagePath({
    buildingId,
    ownerId,
    fileName,
  });

  const response = await fetch(imageUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from(EQUIPMENT_IMAGES_BUCKET)
    .upload(filePath, blob, {
      contentType: mimeType || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading equipment image:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(EQUIPMENT_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
}

/* =========================================================
   שליפות ציוד
   ========================================================= */

/**
 * שליפת כל פריטי הציוד של בניין מסוים
 * כולל גם זמינים וגם לא זמינים.
 * מתאים למסכי ניהול / הפריטים שלי.
 */
export async function getBuildingEquipment(buildingId) {
  const supabase = getSupabase();

  if (!buildingId) {
    throw new Error("לא זוהה בניין.");
  }

  const { data, error } = await supabase
    .from("building_equipment")
    .select(`
      id,
      building_id,
      owner_id,
      category_id,
      title,
      description,
      is_available,
      item_image_url,
      created_at,
      updated_at,
      equipment_categories (
        id,
        name,
        description,
        image_url
      )
    `)
    .eq("building_id", buildingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching building equipment:", error);
    throw error;
  }

  return attachOwnerProfiles(data || []);
}

/**
 * שליפת ציוד זמין בלבד לפי בניין
 * מתאים ללוח ההשאלות הכללי.
 */
export async function getAvailableBuildingEquipment(buildingId) {
  const supabase = getSupabase();

  if (!buildingId) {
    throw new Error("לא זוהה בניין.");
  }

  const { data, error } = await supabase
    .from("building_equipment")
    .select(`
      id,
      building_id,
      owner_id,
      category_id,
      title,
      description,
      is_available,
      item_image_url,
      created_at,
      updated_at,
      equipment_categories (
        id,
        name,
        description,
        image_url
      )
    `)
    .eq("building_id", buildingId)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching available building equipment:", error);
    throw error;
  }

  return attachOwnerProfiles(data || []);
}

/**
 * שליפת ציוד לפי בניין וקטגוריה
 *
 * שינוי חשוב:
 * כברירת מחדל מחזיר רק ציוד זמין.
 * כך לאחר אישור השאלה, הפריט לא יופיע יותר בלוח.
 *
 * אם בעתיד תרצה במסך ניהול לראות גם לא זמינים:
 * getBuildingEquipmentByCategory(buildingId, categoryId, { onlyAvailable: false })
 */
export async function getBuildingEquipmentByCategory(
  buildingId,
  categoryId,
  options = {}
) {
  const supabase = getSupabase();

  const { onlyAvailable = true } = options;

  if (!buildingId) {
    throw new Error("לא זוהה בניין.");
  }

  if (!categoryId) {
    throw new Error("לא זוהתה קטגוריה.");
  }

  let query = supabase
    .from("building_equipment")
    .select(`
      id,
      building_id,
      owner_id,
      category_id,
      title,
      description,
      is_available,
      item_image_url,
      created_at,
      updated_at,
      equipment_categories (
        id,
        name,
        description,
        image_url
      )
    `)
    .eq("building_id", buildingId)
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false });

  if (onlyAvailable) {
    query = query.eq("is_available", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching building equipment by category:", error);
    throw error;
  }

  return attachOwnerProfiles(data || []);
}

/**
 * שליפת פריט ציוד בודד לפי מזהה
 * כולל פרטי בעל הציוד, כדי להציג שם משאיל במסך הפרטים.
 */
export async function getEquipmentItemById(equipmentId) {
  const supabase = getSupabase();

  if (!equipmentId) {
    throw new Error("לא זוהה פריט ציוד.");
  }

  const { data, error } = await supabase
    .from("building_equipment")
    .select(`
      id,
      building_id,
      owner_id,
      category_id,
      title,
      description,
      is_available,
      item_image_url,
      created_at,
      updated_at,
      equipment_categories (
        id,
        name,
        description,
        image_url
      )
    `)
    .eq("id", equipmentId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching equipment item by id:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  const profilesMap = await getProfilesMapByAuthIds([data.owner_id]);

  return {
    ...data,
    owner_profile: profilesMap[data.owner_id] || null,
  };
}

/* =========================================================
   יצירה / עדכון / מחיקה
   ========================================================= */

/**
 * הוספת פריט ציוד חדש
 */
export async function createEquipmentItem({
  buildingId,
  ownerId,
  categoryId,
  title,
  description = null,
  itemImageUrl = null,
}) {
  const supabase = getSupabase();

  if (!buildingId) {
    throw new Error("לא זוהה בניין עבור הפריט.");
  }

  if (!ownerId) {
    throw new Error("לא זוהה בעל הפריט.");
  }

  if (!categoryId) {
    throw new Error("יש לבחור קטגוריה.");
  }

  if (!title || !title.trim()) {
    throw new Error("יש להזין שם לפריט.");
  }

  const cleanTitle = title.trim();

  if (cleanTitle.length < 2) {
    throw new Error("שם הפריט חייב להכיל לפחות 2 תווים.");
  }

  const payload = {
    building_id: buildingId,
    owner_id: ownerId,
    category_id: categoryId,
    title: cleanTitle,
    description: cleanText(description),
    item_image_url: itemImageUrl || null,
    is_available: true,
  };

  const { data, error } = await supabase
    .from("building_equipment")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Error creating equipment item:", error);
    throw error;
  }

  return data;
}

/**
 * עדכון פריט ציוד קיים
 */
export async function updateEquipmentItem(equipmentId, updates = {}) {
  const supabase = getSupabase();

  if (!equipmentId) {
    throw new Error("לא זוהה פריט לעדכון.");
  }

  const allowedUpdates = {
    title: updates.title !== undefined ? cleanText(updates.title) : undefined,
    description:
      updates.description !== undefined ? cleanText(updates.description) : undefined,
    category_id: updates.categoryId,
    item_image_url: updates.itemImageUrl,
    is_available: updates.isAvailable,
  };

  Object.keys(allowedUpdates).forEach((key) => {
    if (allowedUpdates[key] === undefined) {
      delete allowedUpdates[key];
    }
  });

  if (allowedUpdates.title !== undefined && !allowedUpdates.title) {
    throw new Error("שם הפריט לא יכול להיות ריק.");
  }

  const { data, error } = await supabase
    .from("building_equipment")
    .update(allowedUpdates)
    .eq("id", equipmentId)
    .select()
    .single();

  if (error) {
    console.error("Error updating equipment item:", error);
    throw error;
  }

  return data;
}

/**
 * סימון פריט כזמין / לא זמין
 * שימושי כאשר בקשה אושרה או כאשר פריט הוחזר.
 */
export async function updateEquipmentAvailability(equipmentId, isAvailable) {
  return updateEquipmentItem(equipmentId, {
    isAvailable,
  });
}

/**
 * מחיקת פריט ציוד
 */
export async function deleteEquipmentItem(equipmentId) {
  const supabase = getSupabase();

  if (!equipmentId) {
    throw new Error("לא זוהה פריט למחיקה.");
  }

  const { error } = await supabase
    .from("building_equipment")
    .delete()
    .eq("id", equipmentId);

  if (error) {
    console.error("Error deleting equipment item:", error);
    throw error;
  }

  return true;
}

/**
 * שליפת כל פריטי הציוד של משתמש מסוים בתוך בניין
 * כאן כן מחזירים גם פריטים לא זמינים, כדי שבעל הציוד יראה את כל הפריטים שלו.
 */
export async function getMyEquipmentItems(buildingId, ownerId) {
  const supabase = getSupabase();

  if (!buildingId || !ownerId) {
    throw new Error("חסרים נתוני בניין או משתמש.");
  }

  const { data, error } = await supabase
    .from("building_equipment")
    .select(`
      id,
      building_id,
      owner_id,
      category_id,
      title,
      description,
      is_available,
      item_image_url,
      created_at,
      updated_at,
      equipment_categories (
        id,
        name,
        description,
        image_url
      )
    `)
    .eq("building_id", buildingId)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching my equipment items:", error);
    throw error;
  }

  return attachOwnerProfiles(data || []);
}

/* =========================================================
   חיפוש ציוד
   ========================================================= */

/**
 * חיפוש ציוד בבניין עם תמיכה בשגיאות כתיב ו-fallback לפי קטגוריה
 *
 * שינוי חשוב:
 * אחרי הקריאה ל-RPC אנחנו מסננים רק פריטים זמינים.
 * כך גם אם הפונקציה ב-Supabase מחזירה פריט לא זמין,
 * הוא לא יוצג בלוח ההשאלות.
 */
export async function searchEquipmentInBuilding(buildingId, query, limit = 20) {
  const supabase = getSupabase();

  const cleanQuery = query?.trim();

  if (!buildingId || !cleanQuery) {
    return [];
  }

  const { data, error } = await supabase.rpc("search_equipment_for_building", {
    p_building_id: buildingId,
    p_query: cleanQuery,
    p_limit: limit,
  });

  if (error) {
    console.error("Error searching equipment in building:", error);
    throw error;
  }

  const availableOnly = (data || []).filter((item) => item.is_available === true);

  return attachOwnerProfiles(availableOnly);
}

/* =========================================================
   ציוד לפי מזג אוויר / חג
   ========================================================= */

/**
 * שליפת ציוד זמין לפי תגית מזג אוויר
 *
 * הערה:
 * Supabase לא תמיד מסנן nested relation בצורה אמינה עם contains על relation.
 * לכן מביאים פריטים זמינים ואז מסננים בצד הלקוח לפי equipment_categories.weather_tags.
 */
export async function getAvailableEquipmentByWeatherTag(buildingId, weatherTag) {
  const supabase = getSupabase();

  if (!buildingId || !weatherTag) {
    return [];
  }

  const { data, error } = await supabase
    .from("building_equipment")
    .select(`
      id,
      building_id,
      owner_id,
      category_id,
      title,
      description,
      is_available,
      item_image_url,
      created_at,
      updated_at,
      equipment_categories (
        id,
        name,
        description,
        image_url,
        weather_tags,
        holiday_tags
      )
    `)
    .eq("building_id", buildingId)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching weather-based equipment:", error);
    throw error;
  }

  const filtered = (data || []).filter((item) =>
    item.equipment_categories?.weather_tags?.includes(weatherTag)
  );

  return attachOwnerProfiles(filtered);
}

/**
 * שליפת ציוד זמין לפי תגית חג
 */
export async function getAvailableEquipmentByHolidayTag(buildingId, holidayTag) {
  const supabase = getSupabase();

  if (!buildingId || !holidayTag) {
    return [];
  }

  const { data, error } = await supabase
    .from("building_equipment")
    .select(`
      id,
      building_id,
      owner_id,
      category_id,
      title,
      description,
      is_available,
      item_image_url,
      created_at,
      updated_at,
      equipment_categories (
        id,
        name,
        description,
        image_url,
        weather_tags,
        holiday_tags
      )
    `)
    .eq("building_id", buildingId)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching holiday-based equipment:", error);
    throw error;
  }

  const filtered = (data || []).filter((item) =>
    item.equipment_categories?.holiday_tags?.includes(holidayTag)
  );

  return attachOwnerProfiles(filtered);
}

/* =========================================================
   לוגיקת המלצה על שכן מתאים
   ========================================================= */

/**
 * חישוב ציון התאמה לבעל ציוד לפי היסטוריית ההשאלות שלו
 */
function calculateOwnerScore(stats) {
  return (
    stats.returnedCount * 3 +
    stats.approvedCount * 2 -
    stats.rejectedCount -
    stats.cancelledCount
  );
}

/**
 * מחזיר מפת סטטיסטיקות לכל owner_id
 */
async function getOwnerStatsMap(buildingId, ownerIds = []) {
  const supabase = getSupabase();

  if (!buildingId || !ownerIds.length) {
    return {};
  }

  const { data, error } = await supabase
    .from("equipment_loans")
    .select("owner_id, status")
    .eq("building_id", buildingId)
    .in("owner_id", ownerIds);

  if (error) {
    console.error("Error fetching owner recommendation stats:", error);
    throw error;
  }

  const statsMap = {};

  ownerIds.forEach((ownerId) => {
    statsMap[ownerId] = {
      approvedCount: 0,
      returnedCount: 0,
      rejectedCount: 0,
      cancelledCount: 0,
      pendingCount: 0,
      ownerScore: 0,
    };
  });

  (data || []).forEach((loan) => {
    if (!statsMap[loan.owner_id]) {
      statsMap[loan.owner_id] = {
        approvedCount: 0,
        returnedCount: 0,
        rejectedCount: 0,
        cancelledCount: 0,
        pendingCount: 0,
        ownerScore: 0,
      };
    }

    switch (loan.status) {
      case "approved":
        statsMap[loan.owner_id].approvedCount += 1;
        break;
      case "returned":
        statsMap[loan.owner_id].returnedCount += 1;
        break;
      case "rejected":
        statsMap[loan.owner_id].rejectedCount += 1;
        break;
      case "cancelled":
        statsMap[loan.owner_id].cancelledCount += 1;
        break;
      case "pending":
        statsMap[loan.owner_id].pendingCount += 1;
        break;
      default:
        break;
    }
  });

  Object.keys(statsMap).forEach((ownerId) => {
    statsMap[ownerId].ownerScore = calculateOwnerScore(statsMap[ownerId]);
  });

  return statsMap;
}

/**
 * מסמן האם כדאי להציג badge של "מומלץ להשאלה מהירה"
 */
function buildRecommendationFlags(item, ownerStats, currentUserId = null) {
  const ownerScore = ownerStats?.ownerScore ?? 0;
  const isOwnItem = currentUserId && item.owner_id === currentUserId;

  if (isOwnItem) {
    return {
      isFastBorrowRecommended: false,
      recommendationReason: "",
    };
  }

  const isFastBorrowRecommended =
    item.is_available &&
    (
      ownerStats?.returnedCount > 0 ||
      ownerStats?.approvedCount >= 2 ||
      ownerScore >= 3
    );

  let recommendationReason = "";

  if (isFastBorrowRecommended) {
    if ((ownerStats?.returnedCount ?? 0) > 0) {
      recommendationReason = "בעל ציוד עם היסטוריית השאלות מוצלחת";
    } else if ((ownerStats?.approvedCount ?? 0) >= 2) {
      recommendationReason = "שכן פעיל עם זמינות טובה להשאלה";
    } else {
      recommendationReason = "מומלץ להשאלה מהירה";
    }
  }

  return {
    isFastBorrowRecommended,
    recommendationReason,
  };
}

/**
 * שליפת ציוד לפי בניין וקטגוריה + דירוג שכנים מומלצים
 *
 * שינוי חשוב:
 * הפונקציה מבוססת עכשיו על getBuildingEquipmentByCategory עם onlyAvailable=true.
 * כלומר פריט שאושרה עליו השאלה ונקבע לו is_available=false לא יוצג כאן.
 */
export async function getRecommendedBuildingEquipmentByCategory(
  buildingId,
  categoryId,
  currentUserId = null
) {
  const baseItems = await getBuildingEquipmentByCategory(buildingId, categoryId, {
    onlyAvailable: true,
  });

  if (!baseItems.length) {
    return [];
  }

  const ownerIds = [...new Set(baseItems.map((item) => item.owner_id).filter(Boolean))];

  const ownerStatsMap = await getOwnerStatsMap(buildingId, ownerIds);

  const enrichedItems = baseItems.map((item) => {
    const ownerStats = ownerStatsMap[item.owner_id] || {
      approvedCount: 0,
      returnedCount: 0,
      rejectedCount: 0,
      cancelledCount: 0,
      pendingCount: 0,
      ownerScore: 0,
    };

    const isOwnItem = currentUserId && item.owner_id === currentUserId;

    const flags = buildRecommendationFlags(item, ownerStats, currentUserId);

    return {
      ...item,
      approvedCount: ownerStats.approvedCount,
      returnedCount: ownerStats.returnedCount,
      rejectedCount: ownerStats.rejectedCount,
      cancelledCount: ownerStats.cancelledCount,
      pendingCount: ownerStats.pendingCount,
      ownerScore: ownerStats.ownerScore,
      isOwnItem,
      isFastBorrowRecommended: flags.isFastBorrowRecommended,
      recommendationReason: flags.recommendationReason,
    };
  });

  enrichedItems.sort((a, b) => {
    if (a.isOwnItem !== b.isOwnItem) {
      return a.isOwnItem ? 1 : -1;
    }

    if (a.isFastBorrowRecommended !== b.isFastBorrowRecommended) {
      return a.isFastBorrowRecommended ? -1 : 1;
    }

    if (a.ownerScore !== b.ownerScore) {
      return b.ownerScore - a.ownerScore;
    }

    return new Date(b.created_at) - new Date(a.created_at);
  });

  return enrichedItems;
}