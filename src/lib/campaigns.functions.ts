import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function defaultCaption(p: {
  product_name: string | null;
  promo_price: number | null;
  old_price: number | null;
  discount_percent: number | null;
}) {
  const name = p.product_name ?? "Notre offre";
  const price = p.promo_price != null ? `${String(p.promo_price).replace(".", ",")} €` : null;
  const old = p.old_price != null ? `au lieu de ${String(p.old_price).replace(".", ",")} €` : null;
  const discount = p.discount_percent != null ? `-${p.discount_percent}%` : null;
  return [
    `🔥 ${name}`,
    [price, old].filter(Boolean).join(" "),
    discount ? `Promo ${discount} en magasin cette semaine.` : "Profitez-en en magasin cette semaine.",
    "#promo #magasin",
  ].filter(Boolean).join("\n");
}

export const createCampaignFromSelectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      catalog_import_id: z.string().uuid(),
      promotion_ids: z.array(z.string().uuid()).min(1).max(200),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const store = await supabase
      .from("stores").select("id").eq("user_id", userId).limit(1).maybeSingle();
    const storeId = store.data?.id ?? null;

    const now = new Date();
    const name = `Campagne catalogue - ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

    const { data: camp, error: ecamp } = await supabase
      .from("campaigns")
      .insert({
        user_id: userId,
        store_id: storeId,
        catalog_import_id: data.catalog_import_id,
        name,
        status: "in_creation",
      })
      .select("*").single();
    if (ecamp) throw new Error(ecamp.message);

    const { data: promos, error: ep } = await supabase
      .from("catalog_promotions")
      .select("*")
      .in("id", data.promotion_ids)
      .eq("user_id", userId);
    if (ep) throw new Error(ep.message);

    const recDate = (d?: string | null) => {
      if (d) return d;
      const t = new Date(); t.setDate(t.getDate() + 2);
      return t.toISOString().slice(0, 10);
    };

    const items = (promos ?? []).map((p) => ({
      campaign_id: camp.id,
      catalog_promotion_id: p.id,
      user_id: userId,
      store_id: storeId,
      product_name: p.product_name ?? "Produit",
      promo_price: p.promo_price,
      old_price: p.old_price,
      discount_percent: p.discount_percent,
      category: p.category,
      start_date: p.start_date,
      end_date: p.end_date,
      source_image_url: p.product_image_url,
      creation_mode: p.creation_mode ?? null,
      status: "to_create" as const,
      recommended_platform: "facebook",
      recommended_format: "fb_post",
      recommended_date: recDate(p.start_date),
      recommended_time: "10:00",
      generated_caption: defaultCaption(p),
    }));

    if (items.length > 0) {
      const { error: ei } = await supabase.from("campaign_items").insert(items);
      if (ei) throw new Error(ei.message);
    }

    return { campaign_id: camp.id, items_count: items.length };
  });

export const listCampaignsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("campaigns").select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listCampaignItemsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ campaign_id: z.string().uuid().nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let campaignId = data.campaign_id ?? null;
    if (!campaignId) {
      const { data: latest } = await supabase
        .from("campaigns").select("id")
        .eq("user_id", userId)
        .neq("status", "scheduled")
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle();
      campaignId = latest?.id ?? null;
    }
    if (!campaignId) return { campaign_id: null, items: [] as never[] };
    const { data: items, error } = await supabase
      .from("campaign_items").select("*")
      .eq("campaign_id", campaignId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { campaign_id: campaignId, items: items ?? [] };
  });

export const getCampaignItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("campaign_items").select("*")
      .eq("id", data.id).eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCampaignItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      creation_mode: z.enum(["catalog_visual", "field_photo"]).nullable().optional(),
      status: z.enum(["to_create", "in_progress", "to_validate", "validated", "scheduled"]).optional(),
      final_visual_url: z.string().max(2000).nullable().optional(),
      generated_caption: z.string().max(5000).nullable().optional(),
      recommended_platform: z.string().max(40).nullable().optional(),
      recommended_format: z.string().max(40).nullable().optional(),
      recommended_date: z.string().nullable().optional(),
      recommended_time: z.string().max(10).nullable().optional(),
      scheduled_post_id: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("campaign_items").update(patch)
      .eq("id", id).eq("user_id", context.userId)
      .select("*").single();
    if (error) throw new Error(error.message);

    // Update parent campaign status when all items scheduled
    const { data: all } = await context.supabase
      .from("campaign_items").select("status, campaign_id")
      .eq("campaign_id", row.campaign_id).eq("user_id", context.userId);
    if (all && all.length > 0) {
      const allScheduled = all.every((i) => i.status === "scheduled");
      const allValidated = all.every((i) => i.status === "validated" || i.status === "scheduled");
      const newStatus = allScheduled ? "scheduled" : allValidated ? "ready_to_schedule" : "in_creation";
      await context.supabase.from("campaigns")
        .update({ status: newStatus })
        .eq("id", row.campaign_id).eq("user_id", context.userId);
    }
    return row;
  });
