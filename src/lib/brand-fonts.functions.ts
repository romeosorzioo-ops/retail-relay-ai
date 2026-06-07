import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listBrandFontsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Récupère les polices de l'utilisateur, filtrées par enseigne :
    // une police sans `allowed_brands` est universelle ; sinon il faut
    // que l'enseigne du magasin soit listée.
    const store = await context.supabase
      .from("stores")
      .select("store_brand, banner")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    const brand = store.data?.store_brand ?? store.data?.banner ?? null;

    const { data, error } = await context.supabase
      .from("brand_fonts")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!brand) return rows.filter((r) => !r.allowed_brands?.length);
    return rows.filter(
      (r) =>
        !r.allowed_brands?.length || r.allowed_brands.includes(brand),
    );
  });

export const addBrandFontFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(80),
        url: z.string().min(1).max(2000),
        format: z.string().max(20).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const store = await context.supabase
      .from("stores")
      .select("id")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
export const addBrandFontFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(80),
        url: z.string().min(1).max(2000),
        format: z.string().max(20).nullable().optional(),
        allowed_brands: z.array(z.string().max(80)).max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const store = await context.supabase
      .from("stores")
      .select("id, store_brand, banner")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    // Si l'utilisateur ne précise pas d'enseignes, on attache la police à
    // l'enseigne de son magasin par défaut.
    const defaultBrand =
      store.data?.store_brand ?? store.data?.banner ?? null;
    const allowed =
      data.allowed_brands && data.allowed_brands.length > 0
        ? data.allowed_brands
        : defaultBrand
          ? [defaultBrand]
          : [];
    const { data: row, error } = await context.supabase
      .from("brand_fonts")
      .insert({
        user_id: context.userId,
        store_id: store.data?.id ?? null,
        name: data.name,
        url: data.url,
        format: data.format ?? null,
        allowed_brands: allowed,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteBrandFontFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("brand_fonts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
