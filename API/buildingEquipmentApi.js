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
 * מומלץ לאפשר רק לבעל הפריט לעדכן
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
 * מומלץ ב-RLS לאפשר רק לבעלים למחוק
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