// buildingEquipmentApi.js
// API לניהול ציוד להשאלה לפי בניין

import { getSupabase } from "../DataBase/supabase";

/**
 * שליפת כל פריטי הציוד של בניין מסוים
 */
export async function getBuildingEquipment(buildingId) {
  const supabase = getSupabase();

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

  return data || [];
}

/**
 * שליפת ציוד זמין בלבד לפי בניין
 */
export async function getAvailableBuildingEquipment(buildingId) {
  const supabase = getSupabase();

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

  return data || [];
}

/**
 * שליפת ציוד לפי בניין וקטגוריה
 * נשארת כפי שהיא, למקרה שתרצה עדיין להשתמש בה במקומות אחרים
 */
export async function getBuildingEquipmentByCategory(buildingId, categoryId) {
  const supabase = getSupabase();

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
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching building equipment by category:", error);
    throw error;
  }

  return data || [];
}

/**
 * שליפת פריט ציוד בודד לפי מזהה
 */
export async function getEquipmentItemById(equipmentId) {
  const supabase = getSupabase();

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
    .single();

  if (error) {
    console.error("Error fetching equipment item by id:", error);
    throw error;
  }

  return data;
}

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

  const payload = {
    building_id: buildingId,
    owner_id: ownerId,
    category_id: categoryId,
    title,
    description,
    item_image_url: itemImageUrl,
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
export async function updateEquipmentItem(equipmentId, updates) {
  const supabase = getSupabase();

  const allowedUpdates = {
    title: updates.title,
    description: updates.description,
    category_id: updates.categoryId,
    item_image_url: updates.itemImageUrl,
    is_available: updates.isAvailable,
  };

  Object.keys(allowedUpdates).forEach((key) => {
    if (allowedUpdates[key] === undefined) {
      delete allowedUpdates[key];
    }
  });

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
 * מחיקת פריט ציוד
 */
export async function deleteEquipmentItem(equipmentId) {
  const supabase = getSupabase();

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
 */
export async function getMyEquipmentItems(buildingId, ownerId) {
  const supabase = getSupabase();

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

  return data || [];
}

/**
 * חיפוש ציוד בבניין עם תמיכה בשגיאות כתיב ו-fallback לפי קטגוריה
 */
export async function searchEquipmentInBuilding(buildingId, query, limit = 20) {
  const supabase = getSupabase();

  const cleanQuery = query?.trim();
  if (!cleanQuery) {
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

  return data || [];
}

/**
 * שליפת ציוד זמין לפי תגית מזג אוויר
 */
export async function getAvailableEquipmentByWeatherTag(buildingId, weatherTag) {
  const supabase = getSupabase();

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
    .contains("equipment_categories.weather_tags", [weatherTag])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching weather-based equipment:", error);
    throw error;
  }

  return data || [];
}

/**
 * שליפת ציוד זמין לפי תגית חג
 */
export async function getAvailableEquipmentByHolidayTag(buildingId, holidayTag) {
  const supabase = getSupabase();

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
    .contains("equipment_categories.holiday_tags", [holidayTag])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching holiday-based equipment:", error);
    throw error;
  }

  return data || [];
}

/* ===========================
   לוגיקת המלצה על שכן מתאים
   =========================== */

/**
 * חישוב ציון התאמה לבעל ציוד לפי היסטוריית ההשאלות שלו
 */
function calculateOwnerScore(stats) {
  return (
    (stats.returnedCount * 3) +
    (stats.approvedCount * 2) -
    stats.rejectedCount -
    stats.cancelledCount
  );
}

/**
 * מחזיר מפת סטטיסטיקות לכל owner_id
 */
async function getOwnerStatsMap(buildingId, ownerIds = []) {
  const supabase = getSupabase();

  if (!ownerIds.length) {
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
 */
export async function getRecommendedBuildingEquipmentByCategory(
  buildingId,
  categoryId,
  currentUserId = null
) {
  const baseItems = await getBuildingEquipmentByCategory(buildingId, categoryId);

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
    if (a.is_available !== b.is_available) {
      return a.is_available ? -1 : 1;
    }

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