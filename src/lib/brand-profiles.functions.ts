import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const brandSchema = z.object({
  logo_url: z.string().max(2000).nullable().optional(),
  primary_color: z.string().max(20).nullable().optional(),
  secondary_color: z.string().max(20).nullable().optional(),
  font_family: z.string().max(80).nullable().optional(),
  slogan: z.string().max(200).nullable().optional(),
  communication_style: z.string().max(60).nullable().optional(),
});

export const getMyBrandProfileFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("brand_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertBrandProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => brandSchema.parse(d))
  .handler(async ({ data, context }) => {
    const store = await context.supabase
      .from("stores")
      .select("id")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    const payload = {
      user_id: context.userId,
      store_id: store.data?.id ?? null,
      logo_url: data.logo_url ?? null,
      primary_color: data.primary_color ?? null,
      secondary_color: data.secondary_color ?? null,
      font_family: data.font_family ?? null,
      slogan: data.slogan ?? null,
      communication_style: data.communication_style ?? null,
    };
    const existing = await context.supabase
      .from("brand_profiles")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) {
      const { data: updated, error } = await context.supabase
        .from("brand_profiles")
        .update(payload)
        .eq("id", existing.data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: inserted, error } = await context.supabase
      .from("brand_profiles")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });
