import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import EquipmentCategoriesScreen from "../screens/EquipmentCategoriesScreen";
import { getEquipmentCategories } from "../API/equipmentCategoriesApi";

jest.mock("../API/equipmentCategoriesApi", () => ({
  getEquipmentCategories: jest.fn(),
}));

describe("EquipmentCategoriesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders categories from API", async () => {
    getEquipmentCategories.mockResolvedValue([
      {
        id: "c1",
        name: "כלי עבודה",
        description: "מקדחות וכלים",
        image_url: null,
      },
    ]);

    const navigation = { navigate: jest.fn() };
    const route = {
      params: {
        buildingId: "b1",
        user: { id: "u1" },
      },
    };

    const { getByText } = render(
      <EquipmentCategoriesScreen navigation={navigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText("כלי עבודה")).toBeTruthy();
    });

    expect(getByText("מקדחות וכלים")).toBeTruthy();
  });

  test("navigates to EquipmentList when category is pressed", async () => {
    getEquipmentCategories.mockResolvedValue([
      {
        id: "c1",
        name: "כלי עבודה",
        description: "מקדחות וכלים",
        image_url: null,
      },
    ]);

    const navigation = { navigate: jest.fn() };
    const route = {
      params: {
        buildingId: "b1",
        user: { id: "u1" },
      },
    };

    const { getByText } = render(
      <EquipmentCategoriesScreen navigation={navigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText("כלי עבודה")).toBeTruthy();
    });

    fireEvent.press(getByText("כלי עבודה"));

    expect(navigation.navigate).toHaveBeenCalledWith("EquipmentList", {
      buildingId: "b1",
      user: { id: "u1" },
      categoryId: "c1",
      categoryName: "כלי עבודה",
    });
  });
});