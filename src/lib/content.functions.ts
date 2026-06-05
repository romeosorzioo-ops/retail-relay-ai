import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ContentRow = {
  id: string;
  user_id: string;
  promotion_id: string | null;
  facebook_post: string;
  instagram_post: string;
  instagram_story: string;
  reel_idea: string;
  created_at: string;
  updated_at: string;
  promotions: { product_name: string } | null;
};

export const listContentsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("generated_contents")
      .select("*, promotions(product_name)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => {
      const row = r as unknown as ContentRow;
      return { ...row, promo_name: row.promotions?.product_name ?? null };
    });
  });

export const deleteContentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("generated_contents")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateContentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        facebook_post: z.string().max(5000),
        instagram_post: z.string().max(5000),
        instagram_story: z.string().max(5000),
        reel_idea: z.string().max(5000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("generated_contents")
      .update({
        facebook_post: data.facebook_post,
        instagram_post: data.instagram_post,
        instagram_story: data.instagram_story,
        reel_idea: data.reel_idea,
      })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const generateContentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ promotion_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const storeRes = await context.supabase
      .from("stores")
      .select("*")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    const promoRes = await context.supabase
      .from("promotions")
      .select("*")
      .eq("id", data.promotion_id)
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();

    const store = storeRes.data;
    const promo = promoRes.data;
    if (!store) throw new Error("Configurez d'abord votre profil magasin.");
    if (!promo) throw new Error("Promotion introuvable.");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY manquant.");

    const { createLovableAiGatewayProvider } = await import(
      "@/lib/ai-gateway.server"
    );
    const { generateObject } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const sys = `Tu es un expert en marketing local pour les magasins de grande distribution alimentaire en France.
Tu rédiges des contenus pour les réseaux sociaux, en français, avec un ton ${store.tone ?? "professionnel"}, adapté à un magasin ${store.banner} situé à ${store.city ?? "en France"}.
Inclure des emojis pertinents, des hashtags locaux, et un call-to-action. Mettre en avant la promo. Pas d'invention de prix.`;

    const prompt = `Magasin: ${store.name} (${store.banner})
Ville: ${store.city ?? "-"}
Description: ${store.description ?? "-"}
Rayons forts: ${(store.strong_departments ?? []).join(", ") || "-"}

Promotion:
- Produit: ${promo.product_name}
- Prix: ${promo.price ?? "-"} €${promo.old_price ? ` (au lieu de ${promo.old_price} €)` : ""}
- Catégorie: ${promo.category ?? "-"}
- Dates: ${promo.start_date ?? "-"} → ${promo.end_date ?? "-"}

Génère 4 contenus prêts à publier.`;

    const { experimental_output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: sys,
      prompt,
      experimental_output: Output.object({
        schema: z.object({
          facebook_post: z.string(),
          instagram_post: z.string(),
          instagram_story: z.string(),
          reel_idea: z.string(),
        }),
      }),
    });

    const out = experimental_output;
    const { data: inserted, error } = await context.supabase
      .from("generated_contents")
      .insert({
        user_id: context.userId,
        promotion_id: promo.id,
        facebook_post: out.facebook_post,
        instagram_post: out.instagram_post,
        instagram_story: out.instagram_story,
        reel_idea: out.reel_idea,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });
