import {
  getEquipmentCategoriesByWeatherTag,
  getEquipmentCategoriesByHolidayTag,
} from "../API/equipmentCategoriesApi";

import { getBuildingEquipmentByCategory } from "../API/buildingEquipmentApi";
import {
  getCurrentHolidayContext,
  getCurrentWeatherContext,
} from "../utils/contextRecommendations";

export async function getContextualEquipmentRecommendations(buildingId) {
  const weatherContext = getCurrentWeatherContext();
  const holidayContext = getCurrentHolidayContext();

  let weatherItems = [];
  let holidayItems = [];

  if (weatherContext?.key) {
    const weatherCategories = await getEquipmentCategoriesByWeatherTag(weatherContext.key);

    const weatherResults = await Promise.all(
      weatherCategories.map((category) =>
        getBuildingEquipmentByCategory(buildingId, category.id)
      )
    );

    weatherItems = weatherResults
      .flat()
      .filter((item) => item.is_available)
      .map((item) => ({
        ...item,
        recommendationSource: "weather",
        recommendationLabel: weatherContext.label,
        recommendationReason: weatherContext.reason,
      }));
  }

  if (holidayContext?.key) {
    const holidayCategories = await getEquipmentCategoriesByHolidayTag(holidayContext.key);

    const holidayResults = await Promise.all(
      holidayCategories.map((category) =>
        getBuildingEquipmentByCategory(buildingId, category.id)
      )
    );

    holidayItems = holidayResults
      .flat()
      .filter((item) => item.is_available)
      .map((item) => ({
        ...item,
        recommendationSource: "holiday",
        recommendationLabel: holidayContext.label,
        recommendationReason: holidayContext.reason,
      }));
  }

  const uniqueMap = new Map();

  [...holidayItems, ...weatherItems].forEach((item) => {
    if (!uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item);
    }
  });

  return {
    weatherContext,
    holidayContext,
    items: Array.from(uniqueMap.values()),
  };
}