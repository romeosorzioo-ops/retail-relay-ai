import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CONTENT_TYPES = [
  "facebook_post",
  "instagram_post",
  "instagram_story",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

type ContentRow = {
  id: string;
  user_id: string;
  promotion_id: string | null;
  store_id: string | null;
  content_type: ContentType;
  content_text: string;
  reel_idea: string | null;
  created_at: string;
  updated_at: string;
  promotions?: { product_name: string } | null;
};

const aiSchema = z.object({
  facebook_post: z.string().min(1).max(5000),
  instagram_post: z.string().min(1).max(5000),
  instagram_story: z.string().min(1).max(5000),
});

function parseGeneratedContent(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate =
    fenced?.[1] ?? trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);
  try {
    const raw = JSON.parse(candidate) as Record<string, unknown>;
    return aiSchema.parse({
      facebook_post: String(raw.facebook_post ?? raw.facebook ?? "").trim(),
      instagram_post: String(raw.instagram_post ?? raw.instagram ?? "").trim(),
      instagram_story: String(raw.instagram_story ?? raw.story ?? "").trim(),
    });
  } catch {
    throw new Error("La réponse IA n'a pas pu être lue. Réessayez dans quelques secondes.");
  }
}

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

export const listContentsByPromotionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ promotion_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("generated_contents")
      .select("*")
      .eq("user_id", context.userId)
      .eq("promotion_id", data.promotion_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as ContentRow[];
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
        content_text: z.string().min(1).max(5000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("generated_contents")
      .update({ content_text: data.content_text })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated as unknown as ContentRow;
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

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText } = await import("ai");
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

Génère 3 contenus prêts à publier (visuels statiques uniquement, pas de vidéo).

Réponds uniquement avec un objet JSON valide, sans markdown, avec exactement ces clés:
{
  "facebook_post": "...",
  "instagram_post": "...",
  "instagram_story": "..."
}`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: sys,
      prompt,
    });
    const out = parseGeneratedContent(text);

    const rows = [
      { content_type: "facebook_post" as const, content_text: out.facebook_post },
      { content_type: "instagram_post" as const, content_text: out.instagram_post },
      { content_type: "instagram_story" as const, content_text: out.instagram_story },
    ].map((r) => ({
      user_id: context.userId,
      promotion_id: promo.id,
      store_id: store.id,
      content_type: r.content_type,
      content_text: r.content_text,
      reel_idea: null,
    }));

    const { data: inserted, error } = await context.supabase
      .from("generated_contents")
      .insert(rows)
      .select("*");
    if (error) throw new Error(error.message);
    return (inserted ?? []) as unknown as ContentRow[];
  });
