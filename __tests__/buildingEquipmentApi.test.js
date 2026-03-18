import {
  getBuildingEquipmentByCategory,
  createEquipmentItem,
} from "../API/buildingEquipmentApi";
import { getSupabase } from "../DataBase/supabase";

jest.mock("../DataBase/supabase", () => ({
  getSupabase: jest.fn(),
}));

describe("buildingEquipmentApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getBuildingEquipmentByCategory returns filtered items", async () => {
    const orderMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "eq1",
          title: "מקדחה",
          building_id: "b1",
          category_id: "c1",
        },
      ],
      error: null,
    });

    const eqCategoryMock = jest.fn(() => ({
      order: orderMock,
    }));

    const eqBuildingMock = jest.fn(() => ({
      eq: eqCategoryMock,
    }));

    const selectMock = jest.fn(() => ({
      eq: eqBuildingMock,
    }));

    const fromMock = jest.fn(() => ({
      select: selectMock,
    }));

    getSupabase.mockReturnValue({
      from: fromMock,
    });

    const result = await getBuildingEquipmentByCategory("b1", "c1");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("מקדחה");
    expect(fromMock).toHaveBeenCalledWith("building_equipment");
  });

  test("createEquipmentItem inserts a new item", async () => {
    const singleMock = jest.fn().mockResolvedValue({
      data: {
        id: "eq1",
        title: "מקדחה",
      },
      error: null,
    });

    const selectMock = jest.fn(() => ({
      single: singleMock,
    }));

    const insertMock = jest.fn(() => ({
      select: selectMock,
    }));

    const fromMock = jest.fn(() => ({
      insert: insertMock,
    }));

    getSupabase.mockReturnValue({
      from: fromMock,
    });

    const result = await createEquipmentItem({
      buildingId: "b1",
      ownerId: "u1",
      categoryId: "c1",
      title: "מקדחה",
      description: "חדשה",
      itemImageUrl: null,
    });

    expect(result.title).toBe("מקדחה");
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        building_id: "b1",
        owner_id: "u1",
        category_id: "c1",
        title: "מקדחה",
        is_available: true,
      }),
    ]);
  });
});