import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const guidelineSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  brand: z.string().trim().min(1).max(80),
  name: z.string().max(120).nullable().optional(),
  primary_color: z.string().max(20).nullable().optional(),
  secondary_color: z.string().max(20).nullable().optional(),
  accent_color: z.string().max(20).nullable().optional(),
  logo_url: z.string().max(2000).nullable().optional(),
  title_font_id: z.string().uuid().nullable().optional(),
  body_font_id: z.string().uuid().nullable().optional(),
  price_font_id: z.string().uuid().nullable().optional(),
  badge_style: z.string().max(60).nullable().optional(),
  arrow_style: z.string().max(60).nullable().optional(),
});

export const listBrandGuidelinesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("brand_guidelines")
      .select("*")
      .order("brand", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyBrandGuidelineFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const store = await context.supabase
      .from("stores")
      .select("store_brand, banner")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    const brand = store.data?.store_brand ?? store.data?.banner ?? null;
    if (!brand) return null;
    const { data, error } = await context.supabase
      .from("brand_guidelines")
      .select("*")
      .eq("brand", brand)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertBrandGuidelineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => guidelineSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const payload = {
      brand: data.brand,
      name: data.name ?? null,
      primary_color: data.primary_color ?? null,
      secondary_color: data.secondary_color ?? null,
      accent_color: data.accent_color ?? null,
      logo_url: data.logo_url ?? null,
      title_font_id: data.title_font_id ?? null,
      body_font_id: data.body_font_id ?? null,
      price_font_id: data.price_font_id ?? null,
      badge_style: data.badge_style ?? null,
      arrow_style: data.arrow_style ?? null,
    };
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("brand_guidelines")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabaseAdmin
      .from("brand_guidelines")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    // touch context to satisfy lint
    void context.userId;
    return row;
  });

export const duplicateBrandGuidelineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        source_id: z.string().uuid(),
        new_brand: z.string().trim().min(1).max(80),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const src = await supabaseAdmin
      .from("brand_guidelines")
      .select("*")
      .eq("id", data.source_id)
      .single();
    if (src.error) throw new Error(src.error.message);
    const {
      id: _id,
      created_at: _c,
      updated_at: _u,
      ...rest
    } = src.data;
    const { data: row, error } = await supabaseAdmin
      .from("brand_guidelines")
      .insert({ ...rest, brand: data.new_brand, name: `${rest.name ?? rest.brand} (copie)` })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    void context.userId;
    return row;
  });

export const deleteBrandGuidelineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("brand_guidelines")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    void context.userId;
    return { ok: true };
  });
