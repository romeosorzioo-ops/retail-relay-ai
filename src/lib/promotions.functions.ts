import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const promoSchema = z.object({
  product_name: z.string().trim().min(1).max(200),
  price: z.number().nullable().optional(),
  old_price: z.number().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  file_url: z.string().max(2000).nullable().optional(),
  file_type: z.string().max(100).nullable().optional(),
  file_name: z.string().max(255).nullable().optional(),
});

export const listPromotionsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("promotions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPromotionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => promoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const store = await context.supabase
      .from("stores")
      .select("id")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    const { data: inserted, error } = await context.supabase
      .from("promotions")
      .insert({
        user_id: context.userId,
        store_id: store.data?.id ?? null,
        product_name: data.product_name,
        price: data.price ?? null,
        old_price: data.old_price ?? null,
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        category: data.category ?? null,
        file_url: data.file_url ?? null,
        file_type: data.file_type ?? null,
        file_name: data.file_name ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const deletePromotionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("promotions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
