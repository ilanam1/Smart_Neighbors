// equipmentCategoriesApi.js
// API לניהול קטגוריות ציוד להשאלה

import { getSupabase } from "../DataBase/supabase";

/**
 * שליפת כל קטגוריות הציוד
 */
export async function getEquipmentCategories() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("equipment_categories")
    .select("id, name, description, image_url, created_at")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching equipment categories:", error);
    throw error;
  }

  return data || [];
}

/**
 * שליפת קטגוריה בודדת לפי מזהה
 */
export async function getEquipmentCategoryById(categoryId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("equipment_categories")
    .select("id, name, description, image_url, created_at")
    .eq("id", categoryId)
    .single();

  if (error) {
    console.error("Error fetching equipment category by id:", error);
    throw error;
  }

  return data;
}