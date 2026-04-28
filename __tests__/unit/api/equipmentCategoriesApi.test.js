import { getEquipmentCategories } from "../../../API/equipmentCategoriesApi";
import { getSupabase } from "../../../DataBase/supabase";

jest.mock("../../../DataBase/supabase", () => ({
  getSupabase: jest.fn(),
}));

describe("equipmentCategoriesApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getEquipmentCategories returns categories successfully", async () => {
    const orderMock = jest.fn().mockResolvedValue({
      data: [
        { id: "1", name: "כלי עבודה" },
        { id: "2", name: "מטבח" },
      ],
      error: null,
    });

    const selectMock = jest.fn(() => ({
      order: orderMock,
    }));

    const fromMock = jest.fn(() => ({
      select: selectMock,
    }));

    getSupabase.mockReturnValue({
      from: fromMock,
    });

    const result = await getEquipmentCategories();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("כלי עבודה");
    expect(fromMock).toHaveBeenCalledWith("equipment_categories");
  });

  test("getEquipmentCategories throws on error", async () => {
    const fakeError = new Error("DB failed");

    const orderMock = jest.fn().mockResolvedValue({
      data: null,
      error: fakeError,
    });

    const selectMock = jest.fn(() => ({
      order: orderMock,
    }));

    const fromMock = jest.fn(() => ({
      select: selectMock,
    }));

    getSupabase.mockReturnValue({
      from: fromMock,
    });

    await expect(getEquipmentCategories()).rejects.toThrow("DB failed");
  });
});
