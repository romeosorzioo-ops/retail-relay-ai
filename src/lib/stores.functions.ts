import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const storeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  banner: z.string().min(1),
  store_brand: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  tone: z.string().max(40).optional().nullable(),
  frequency: z.string().max(40).optional().nullable(),
  strong_departments: z.array(z.string()).default([]),
});

export const getMyStoreFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("stores")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertStoreFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => storeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      user_id: context.userId,
      name: data.name,
      banner: data.banner,
      store_brand: data.store_brand ?? data.banner ?? null,
      city: data.city ?? null,
      description: data.description ?? null,
      tone: data.tone ?? null,
      frequency: data.frequency ?? null,
      strong_departments: data.strong_departments,
    };
    const existing = await context.supabase
      .from("stores")
      .select("id")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) {
      const { data: updated, error } = await context.supabase
        .from("stores")
        .update(payload)
        .eq("id", existing.data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: inserted, error } = await context.supabase
      .from("stores")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });
