import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CalRow = {
  id: string;
  user_id: string;
  generated_content_id: string | null;
  channel: string;
  scheduled_date: string;
  created_at: string;
  updated_at: string;
  generated_contents: {
    content_type: string;
    content_text: string;
    promotions: { product_name: string } | null;
  } | null;
};

export const listCalendarFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("calendar_posts")
      .select(
        "*, generated_contents(content_type,content_text,promotions(product_name))",
      )
      .eq("user_id", context.userId)
      .order("scheduled_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => {
      const row = r as unknown as CalRow;
      return {
        ...row,
        content_text: row.generated_contents?.content_text ?? null,
        content_type: row.generated_contents?.content_type ?? null,
        promo_name: row.generated_contents?.promotions?.product_name ?? null,
      };
    });
  });

export const addCalendarPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        generated_content_id: z.string().uuid(),
        channel: z.string().min(1).max(40),
        scheduled_date: z.string().min(8),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("calendar_posts")
      .insert({
        user_id: context.userId,
        generated_content_id: data.generated_content_id,
        channel: data.channel,
        scheduled_date: data.scheduled_date,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const moveCalendarPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid(), scheduled_date: z.string().min(8) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("calendar_posts")
      .update({ scheduled_date: data.scheduled_date })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCalendarPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("calendar_posts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const dashboardStatsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [p, c, cal] = await Promise.all([
      context.supabase
        .from("promotions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId),
      context.supabase
        .from("generated_contents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId),
      context.supabase
        .from("calendar_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId),
    ]);
    return {
      promotions: p.count ?? 0,
      contents: c.count ?? 0,
      planned: cal.count ?? 0,
    };
  });
