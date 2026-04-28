import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import AddEquipmentScreen from "../../../screens/AddEquipmentScreen";
import { getEquipmentCategories } from "../../../API/equipmentCategoriesApi";
import { createEquipmentItem } from "../../../API/buildingEquipmentApi";
import { getSupabase } from "../../../DataBase/supabase";

jest.mock("../../../API/equipmentCategoriesApi", () => ({
  getEquipmentCategories: jest.fn(),
}));

jest.mock("../../../API/buildingEquipmentApi", () => ({
  createEquipmentItem: jest.fn(),
}));

jest.mock("../../../DataBase/supabase", () => ({
  getSupabase: jest.fn(),
}));

describe("AddEquipmentScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("submits new equipment successfully", async () => {
    getEquipmentCategories.mockResolvedValue([
      { id: "c1", name: "כלי עבודה" },
    ]);

    createEquipmentItem.mockResolvedValue({
      id: "eq1",
      title: "מקדחה",
    });

    getSupabase.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: "p1",
                auth_uid: "u1",
                first_name: "יוסי",
                building_id: "b1",
              },
              error: null,
            }),
          })),
        })),
      })),
    });

    const navigation = {
      goBack: jest.fn(),
    };

    const route = {
      params: {
        buildingId: "b1",
        user: { id: "u1" },
      },
    };

    const { getByText, getByPlaceholderText } = render(
      <AddEquipmentScreen navigation={navigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText("כלי עבודה")).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText("למשל: מקדחה"), "מקדחה");
    fireEvent.changeText(
      getByPlaceholderText("הוסף תיאור קצר על מצב הפריט או אופן השימוש"),
      "מקדחה תקינה"
    );

    fireEvent.press(getByText("כלי עבודה"));
    fireEvent.press(getByText("שמור ציוד להשאלה"));

    await waitFor(() => {
      expect(createEquipmentItem).toHaveBeenCalledWith({
        buildingId: "b1",
        ownerId: "u1",
        categoryId: "c1",
        title: "מקדחה",
        description: "מקדחה תקינה",
        itemImageUrl: null,
      });
    });
  });
});
