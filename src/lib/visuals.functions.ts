import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  assertAllowedMime,
  assertBase64SizeWithin,
} from "@/lib/upload-validation";

const FORMAT_SCHEMA = z.string().min(1).max(32);

const configSchema = z
  .object({
    layout: z.string().optional(),
    primaryColor: z.string().optional(),
    mainText: z.string().optional(),
    productName: z.string().optional(),
    price: z.string().optional(),
    oldPrice: z.string().optional(),
    badge: z
      .object({ text: z.string().optional(), color: z.string().optional() })
      .optional(),
    bgImage: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
  })
  .passthrough();

export const listVisualTemplatesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("visual_templates")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listCreatedVisualsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("created_visuals")
      .select("*, promotions(product_name)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveVisualFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        template_id: z.string().uuid().nullable().optional(),
        promotion_id: z.string().uuid().nullable().optional(),
        format: FORMAT_SCHEMA,
        image_url: z.string().max(2000).nullable().optional(),
        source_type: z.enum(["template", "catalog", "field_photo"]).optional(),
        source_image_url: z.string().max(2000).nullable().optional(),
        config_json: configSchema,
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
    const { data: row, error } = await context.supabase
      .from("created_visuals")
      .insert({
        user_id: context.userId,
        store_id: store.data?.id ?? null,
        template_id: data.template_id ?? null,
        promotion_id: data.promotion_id ?? null,
        format: data.format,
        image_url: data.image_url ?? null,
        source_type: data.source_type ?? "template",
        source_image_url: data.source_image_url ?? null,
        config_json: data.config_json as never,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const uploadVisualImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        file_name: z.string().min(1).max(255),
        file_type: z.string().min(1).max(100),
        data_base64: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    assertAllowedMime(data.file_type, ALLOWED_IMAGE_MIME_TYPES);
    assertBase64SizeWithin(data.data_base64, MAX_IMAGE_BYTES);
    const buffer = Buffer.from(data.data_base64, "base64");
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Le fichier dépasse la taille maximale autorisée.");
    }
    const ext = data.file_name.split(".").pop() ?? "png";
    const path = `${context.userId}/visuals/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const { error } = await context.supabase.storage
      .from("promotion-files")
      .upload(path, buffer, { contentType: data.file_type, upsert: false });
    if (error) throw new Error(error.message);
    const { data: pub } = context.supabase.storage
      .from("promotion-files")
      .getPublicUrl(path);
    return { url: pub.publicUrl };
  });
