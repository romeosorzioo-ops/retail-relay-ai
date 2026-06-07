import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

const BUCKET = "promotion-files";

/* ============================================================
   Helpers
   ============================================================ */

const uploadInput = z.object({
  folder: z.enum(["templates", "fonts", "graphics"]),
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1).max(120),
  base64: z.string().min(1),
});

export const uploadAdminAssetFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => uploadInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `admin/${data.folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safe}`;
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.length > 15 * 1024 * 1024) {
      throw new Error("Fichier trop lourd (max 15 Mo).");
    }
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: data.content_type,
        upsert: false,
      });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    void context.userId;
    return { url: pub.publicUrl, path };
  });

/* ============================================================
   Roles
   ============================================================ */

export const getMyRolesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.role as string);
  });

/* ============================================================
   Templates
   ============================================================ */

const templateInput = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(160),
  brand: z.string().trim().max(80).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  format: z.string().trim().max(40),
  image_url: z.string().max(2000).nullable().optional(),
  preview_url: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().default(true),
  allowed_brands: z.array(z.string().max(80)).default([]),
});

export const adminListTemplatesFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("visual_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertTemplateFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => templateInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const payload = {
      name: data.name,
      brand: data.brand ?? null,
      category: data.category ?? null,
      format: data.format,
      image_url: data.image_url ?? data.preview_url ?? null,
      preview_url: data.preview_url ?? data.image_url ?? null,
      is_active: data.is_active,
      allowed_brands: data.allowed_brands,
    };
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("visual_templates")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabaseAdmin
      .from("visual_templates")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTemplateFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("visual_templates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
   Fonts (font_assets)
   ============================================================ */

const fontInput = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(160),
  family: z.string().trim().min(1).max(160),
  style: z.string().trim().max(40).default("regular"),
  usage: z.string().trim().max(40).default("text"),
  brand: z.string().trim().max(80).nullable().optional(),
  file_url: z.string().min(1).max(2000),
  is_active: z.boolean().default(true),
});

export const adminListFontAssetsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("font_assets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertFontAssetFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => fontInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const payload = {
      name: data.name,
      family: data.family,
      style: data.style,
      usage: data.usage,
      brand: data.brand ?? null,
      file_url: data.file_url,
      is_active: data.is_active,
    };
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("font_assets")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabaseAdmin
      .from("font_assets")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteFontAssetFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("font_assets")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
   Graphics (graphic_assets)
   ============================================================ */

export const GRAPHIC_TYPES = [
  "arrow",
  "badge",
  "sticker",
  "price_label",
  "local_icon",
  "shape",
] as const;

const graphicInput = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(160),
  type: z.enum(GRAPHIC_TYPES),
  brand: z.string().trim().max(80).nullable().optional(),
  file_url: z.string().min(1).max(2000),
  is_active: z.boolean().default(true),
});

export const adminListGraphicAssetsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("graphic_assets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertGraphicAssetFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => graphicInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const payload = {
      name: data.name,
      type: data.type,
      brand: data.brand ?? null,
      file_url: data.file_url,
      is_active: data.is_active,
    };
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("graphic_assets")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabaseAdmin
      .from("graphic_assets")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteGraphicAssetFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("graphic_assets")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
   Presets (creation_presets)
   ============================================================ */

const presetInput = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(160),
  brand: z.string().trim().min(1).max(80).default("Générique"),
  format: z.string().trim().min(1).max(40),
  template_id: z.string().uuid().nullable().optional(),
  title_font_id: z.string().uuid().nullable().optional(),
  price_font_id: z.string().uuid().nullable().optional(),
  graphic_asset_ids: z.array(z.string().uuid()).default([]),
  config_json: z.record(z.string(), z.unknown()).default({}),
  is_active: z.boolean().default(true),
});

export const adminListPresetsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("creation_presets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertPresetFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => presetInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const payload = {
      name: data.name,
      brand: data.brand,
      format: data.format,
      template_id: data.template_id ?? null,
      title_font_id: data.title_font_id ?? null,
      price_font_id: data.price_font_id ?? null,
      graphic_asset_ids: data.graphic_asset_ids,
      config_json: data.config_json,
      is_active: data.is_active,
    };
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("creation_presets")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabaseAdmin
      .from("creation_presets")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePresetFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("creation_presets")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Liste les presets actifs visibles pour le magasin de l'utilisateur :
 *  - presets de l'enseigne du magasin
 *  - + fallback presets brand = 'Générique'
 * Format optionnel pour filtrer.
 */
export const listMyPresetsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ format: z.string().max(40).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const store = await context.supabase
      .from("stores")
      .select("store_brand, banner")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    const brand = store.data?.store_brand ?? store.data?.banner ?? null;
    let q = context.supabase
      .from("creation_presets")
      .select("*")
      .eq("is_active", true);
    if (data.format) q = q.eq("format", data.format);
    const { data: rows, error } = await q.order("brand", { ascending: true });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const own = brand ? list.filter((p) => p.brand === brand) : [];
    if (own.length > 0) return own;
    return list.filter((p) => p.brand === "Générique" || p.brand === null);
  });
