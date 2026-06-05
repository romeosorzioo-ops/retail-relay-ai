import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLATFORMS = ["facebook", "instagram"] as const;
const POST_TYPES = ["post", "story", "reel"] as const;
const STATUSES = ["draft", "scheduled", "published", "failed"] as const;

const baseSchema = z.object({
  platforms: z.array(z.enum(PLATFORMS)).min(1).max(5),
  post_type: z.enum(POST_TYPES),
  caption: z.string().max(5000).default(""),
  media_url: z.string().max(2000).nullable().optional(),
  media_type: z.string().max(100).nullable().optional(),
  scheduled_at: z.string().min(8),
  promotion_id: z.string().uuid().nullable().optional(),
  generated_content_id: z.string().uuid().nullable().optional(),
  status: z.enum(STATUSES).optional(),
  format: z.string().min(1).max(32).nullable().optional(),
});

export const listScheduledPostsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scheduled_posts")
      .select("*, promotions(product_name)")
      .eq("user_id", context.userId)
      .order("scheduled_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createScheduledPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => baseSchema.parse(d))
  .handler(async ({ data, context }) => {
    const store = await context.supabase
      .from("stores")
      .select("id")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    const { data: row, error } = await context.supabase
      .from("scheduled_posts")
      .insert({
        user_id: context.userId,
        store_id: store.data?.id ?? null,
        promotion_id: data.promotion_id ?? null,
        generated_content_id: data.generated_content_id ?? null,
        platforms: data.platforms,
        post_type: data.post_type,
        caption: data.caption ?? "",
        media_url: data.media_url ?? null,
        media_type: data.media_type ?? null,
        scheduled_at: data.scheduled_at,
        status: data.status ?? "scheduled",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateScheduledPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    baseSchema.extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("scheduled_posts")
      .update({
        platforms: rest.platforms,
        post_type: rest.post_type,
        caption: rest.caption ?? "",
        media_url: rest.media_url ?? null,
        media_type: rest.media_type ?? null,
        scheduled_at: rest.scheduled_at,
        promotion_id: rest.promotion_id ?? null,
        generated_content_id: rest.generated_content_id ?? null,
        status: rest.status ?? "scheduled",
      })
      .eq("id", id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteScheduledPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scheduled_posts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const uploadPostMediaFn = createServerFn({ method: "POST" })
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
    const buffer = Buffer.from(data.data_base64, "base64");
    const ext = data.file_name.split(".").pop() ?? "bin";
    const path = `${context.userId}/posts/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const { error } = await context.supabase.storage
      .from("promotion-files")
      .upload(path, buffer, {
        contentType: data.file_type,
        upsert: false,
      });
    if (error) throw new Error(error.message);
    const { data: pub } = context.supabase.storage
      .from("promotion-files")
      .getPublicUrl(path);
    return { url: pub.publicUrl, type: data.file_type };
  });
