import { createClient } from "@supabase/supabase-js";
import type { Profile } from "@/types";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export function deviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("pp_device");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("pp_device", id);
  }
  return id;
}

export async function loadProfile(): Promise<Profile | null> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("data")
      .eq("device", deviceId())
      .maybeSingle();
    return (data?.data as Profile) ?? null;
  } catch {
    return null;
  }
}

export async function saveProfile(payload: Profile): Promise<void> {
  try {
    await supabase.from("profiles").upsert({
      device: deviceId(),
      data: payload,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // non-fatal — profile save is best-effort
  }
}
