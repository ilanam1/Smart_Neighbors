// serviceProvidersApi.js
import { getSupabase } from "./DataBase/supabase";

export async function listProviders({ onlyActive = true } = {}) {
  const supabase = getSupabase();

  let q = supabase
    .from("service_providers")
    .select("*")
    .order("created_at", { ascending: false });

  if (onlyActive) q = q.eq("is_active", true);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createProvider({ name, phone, email, category, notes }) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("service_providers")
    .insert([{ name, phone, email, category, notes }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProvider(id, patch) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("service_providers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProvider(id) {
  const supabase = getSupabase();

  const { error } = await supabase.from("service_providers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}
