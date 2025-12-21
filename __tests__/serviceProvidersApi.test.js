// tests/serviceProvidersApi.test.js
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
} from "../serviceProvidersApi";

// נMock את getSupabase
jest.mock("../DataBase/supabase", () => ({
  getSupabase: jest.fn(),
}));

const { getSupabase } = require("../DataBase/supabase");

/**
 * יוצר אובייקט "thenable" שמדמה את query builder של supabase-js,
 * כדי שהקוד שלך יוכל לעשות: const { data, error } = await q;
 */
function makeThenable(result, extraMethods = {}) {
  const obj = {
    ...extraMethods,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
    finally: (fn) => Promise.resolve(result).finally(fn),
  };
  return obj;
}

describe("serviceProvidersApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("listProviders: מחזיר ספקים ומסנן רק פעילים כאשר onlyActive=true", async () => {
    const result = {
      data: [{ id: 1, name: "יוסי", is_active: true }],
      error: null,
    };

    const eq = jest.fn(() => makeThenable(result));
    const order = jest.fn(() => makeThenable(result, { eq }));
    const select = jest.fn(() => makeThenable(result, { order, eq }));
    const from = jest.fn(() => makeThenable(result, { select, order, eq }));

    getSupabase.mockReturnValue({ from });

    const data = await listProviders({ onlyActive: true });

    expect(from).toHaveBeenCalledWith("service_providers");
    expect(select).toHaveBeenCalledWith("*");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(eq).toHaveBeenCalledWith("is_active", true);
    expect(data).toEqual(result.data);
  });

  test("listProviders: כאשר onlyActive=false לא מבצע eq על is_active", async () => {
    const result = { data: [{ id: 2, name: "דוד", is_active: false }], error: null };

    const eq = jest.fn(() => makeThenable(result));
    const order = jest.fn(() => makeThenable(result, { eq }));
    const select = jest.fn(() => makeThenable(result, { order, eq }));
    const from = jest.fn(() => makeThenable(result, { select, order, eq }));

    getSupabase.mockReturnValue({ from });

    const data = await listProviders({ onlyActive: false });

    expect(eq).not.toHaveBeenCalled();
    expect(data).toEqual(result.data);
  });

  test("listProviders: זורק שגיאה אם Supabase מחזיר error", async () => {
    const result = { data: null, error: { message: "boom" } };

    const order = jest.fn(() => makeThenable(result));
    const select = jest.fn(() => makeThenable(result, { order }));
    const from = jest.fn(() => makeThenable(result, { select, order }));

    getSupabase.mockReturnValue({ from });

    await expect(listProviders({ onlyActive: false })).rejects.toThrow("boom");
  });

  test("createProvider: מכניס ספק ומחזיר את הרשומה", async () => {
    const inserted = { id: 10, name: "אבי", category: "PLUMBER" };
    const result = { data: inserted, error: null };

    const single = jest.fn(() => makeThenable(result));
    const select = jest.fn(() => makeThenable(result, { single }));
    const insert = jest.fn(() => makeThenable(result, { select, single }));
    const from = jest.fn(() => makeThenable(result, { insert, select, single }));

    getSupabase.mockReturnValue({ from });

    const data = await createProvider({
      name: "אבי",
      phone: "050",
      email: null,
      category: "PLUMBER",
      notes: null,
    });

    expect(from).toHaveBeenCalledWith("service_providers");
    expect(insert).toHaveBeenCalledWith([
      { name: "אבי", phone: "050", email: null, category: "PLUMBER", notes: null },
    ]);
    expect(select).toHaveBeenCalled();
    expect(single).toHaveBeenCalled();
    expect(data).toEqual(inserted);
  });

  test("updateProvider: מעדכן ספק ומחזיר רשומה מעודכנת", async () => {
    const updated = { id: 7, name: "רן", is_active: false };
    const result = { data: updated, error: null };

    const single = jest.fn(() => makeThenable(result));
    const select = jest.fn(() => makeThenable(result, { single }));
    const eq = jest.fn(() => makeThenable(result, { select, single }));
    const update = jest.fn(() => makeThenable(result, { eq, select, single }));
    const from = jest.fn(() => makeThenable(result, { update, eq, select, single }));

    getSupabase.mockReturnValue({ from });

    const data = await updateProvider(7, { is_active: false });

    expect(from).toHaveBeenCalledWith("service_providers");
    expect(update).toHaveBeenCalledWith({ is_active: false });
    expect(eq).toHaveBeenCalledWith("id", 7);
    expect(data).toEqual(updated);
  });

  test("deleteProvider: מוחק ומחזיר true", async () => {
    const result = { error: null };

    const eq = jest.fn(() => Promise.resolve(result));
    const del = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ delete: del }));

    getSupabase.mockReturnValue({ from });

    const ok = await deleteProvider(3);

    expect(from).toHaveBeenCalledWith("service_providers");
    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", 3);
    expect(ok).toBe(true);
  });

  test("deleteProvider: זורק שגיאה אם יש error", async () => {
    const result = { error: { message: "nope" } };

    const eq = jest.fn(() => Promise.resolve(result));
    const del = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ delete: del }));

    getSupabase.mockReturnValue({ from });

    await expect(deleteProvider(3)).rejects.toThrow("nope");
  });
});
