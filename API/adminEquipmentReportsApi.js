import { getSupabase } from "../DataBase/supabase";

/**
 * דוח חיזוי פופולריות ציוד לפי היסטוריית השאלות
 */

export async function getEquipmentPopularityForecast(buildingId, daysBack = 90) {
  const supabase = getSupabase();

  if (!buildingId) {
    throw new Error("לא נשלח מזהה בניין לדוח.");
  }

  const { data, error } = await supabase.rpc("get_equipment_popularity_forecast", {
    p_building_id: buildingId,
    p_days_back: daysBack,
  });

  if (error) {
    console.error("Error fetching equipment popularity forecast:", error);
    throw error;
  }

  return data || [];
}