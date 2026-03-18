import {
  checkEquipmentAvailability,
  requestEquipmentLoan,
  approveLoanRequest,
} from "../API/equipmentLoansApi";
import { getSupabase } from "../DataBase/supabase";

jest.mock("../DataBase/supabase", () => ({
  getSupabase: jest.fn(),
}));

describe("equipmentLoansApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("checkEquipmentAvailability returns available when no overlap exists", async () => {
    const inMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "l1",
          start_date: "2026-03-01",
          end_date: "2026-03-03",
          status: "approved",
        },
      ],
      error: null,
    });

    const eqMock = jest.fn(() => ({
      in: inMock,
    }));

    const selectMock = jest.fn(() => ({
      eq: eqMock,
    }));

    const fromMock = jest.fn(() => ({
      select: selectMock,
    }));

    getSupabase.mockReturnValue({
      from: fromMock,
    });

    const result = await checkEquipmentAvailability("eq1", "2026-03-10", "2026-03-12");

    expect(result.isAvailable).toBe(true);
  });

  test("checkEquipmentAvailability returns unavailable when overlap exists", async () => {
    const inMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "l1",
          start_date: "2026-03-10",
          end_date: "2026-03-12",
          status: "approved",
        },
      ],
      error: null,
    });

    const eqMock = jest.fn(() => ({
      in: inMock,
    }));

    const selectMock = jest.fn(() => ({
      eq: eqMock,
    }));

    const fromMock = jest.fn(() => ({
      select: selectMock,
    }));

    getSupabase.mockReturnValue({
      from: fromMock,
    });

    const result = await checkEquipmentAvailability("eq1", "2026-03-11", "2026-03-14");

    expect(result.isAvailable).toBe(false);
    expect(result.conflicts).toHaveLength(1);
  });

  test("requestEquipmentLoan inserts new request when item is available", async () => {
    const inMock = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const eqMock = jest.fn(() => ({
      in: inMock,
    }));

    const selectAvailabilityMock = jest.fn(() => ({
      eq: eqMock,
    }));

    const singleMock = jest.fn().mockResolvedValue({
      data: {
        id: "loan1",
        status: "pending",
      },
      error: null,
    });

    const selectInsertMock = jest.fn(() => ({
      single: singleMock,
    }));

    const insertMock = jest.fn(() => ({
      select: selectInsertMock,
    }));

    const fromMock = jest
      .fn()
      .mockImplementationOnce(() => ({
        select: selectAvailabilityMock,
      }))
      .mockImplementationOnce(() => ({
        insert: insertMock,
      }));

    getSupabase.mockReturnValue({
      from: fromMock,
    });

    const result = await requestEquipmentLoan({
      buildingId: "b1",
      equipmentId: "eq1",
      ownerId: "u-owner",
      borrowerId: "u-borrower",
      startDate: "2026-03-20",
      endDate: "2026-03-22",
    });

    expect(result.status).toBe("pending");
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        building_id: "b1",
        equipment_id: "eq1",
        owner_id: "u-owner",
        borrower_id: "u-borrower",
        status: "pending",
      }),
    ]);
  });

  test("requestEquipmentLoan throws when item is unavailable", async () => {
    const inMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "loan-exists",
          start_date: "2026-03-20",
          end_date: "2026-03-22",
          status: "approved",
        },
      ],
      error: null,
    });

    const eqMock = jest.fn(() => ({
      in: inMock,
    }));

    const selectMock = jest.fn(() => ({
      eq: eqMock,
    }));

    const fromMock = jest.fn(() => ({
      select: selectMock,
    }));

    getSupabase.mockReturnValue({
      from: fromMock,
    });

    await expect(
      requestEquipmentLoan({
        buildingId: "b1",
        equipmentId: "eq1",
        ownerId: "u-owner",
        borrowerId: "u-borrower",
        startDate: "2026-03-21",
        endDate: "2026-03-23",
      })
    ).rejects.toThrow("הציוד אינו זמין");
  });

  test("approveLoanRequest updates request to approved", async () => {
    const singleLoanMock = jest.fn().mockResolvedValue({
      data: {
        id: "loan1",
        equipment_id: "eq1",
        start_date: "2026-03-20",
        end_date: "2026-03-22",
        status: "pending",
      },
      error: null,
    });

    const selectLoanMock = jest.fn(() => ({
      eq: jest.fn(() => ({
        single: singleLoanMock,
      })),
    }));

    const inAvailabilityMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "loan1",
          start_date: "2026-03-20",
          end_date: "2026-03-22",
          status: "pending",
        },
      ],
      error: null,
    });

    const selectAvailabilityMock = jest.fn(() => ({
      eq: jest.fn(() => ({
        in: inAvailabilityMock,
      })),
    }));

    const singleUpdateMock = jest.fn().mockResolvedValue({
      data: {
        id: "loan1",
        status: "approved",
      },
      error: null,
    });

    const updateMock = jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: singleUpdateMock,
        })),
      })),
    }));

    const fromMock = jest
      .fn()
      .mockImplementationOnce(() => ({
        select: selectLoanMock,
      }))
      .mockImplementationOnce(() => ({
        select: selectAvailabilityMock,
      }))
      .mockImplementationOnce(() => ({
        update: updateMock,
      }));

    getSupabase.mockReturnValue({
      from: fromMock,
    });

    const result = await approveLoanRequest("loan1");

    expect(result.status).toBe("approved");
  });
});