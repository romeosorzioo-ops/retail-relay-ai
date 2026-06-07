import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------ Schemas ------
const detectedPromoSchema = z.object({
  product_name: z.string().min(1).max(200),
  promo_price: z.number().nullable().optional(),
  old_price: z.number().nullable().optional(),
  discount_percent: z.number().nullable().optional(),
  category: z.string().max(60).nullable().optional(),
});
export type DetectedPromo = z.infer<typeof detectedPromoSchema>;

const analysisSchema = z.object({
  promotions: z.array(detectedPromoSchema).max(40),
});

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate =
    fenced?.[1] ??
    trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

// ------ Anonymous: PDF analysis ------
export const analyzeAnonymousPdfFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        file_name: z.string().min(1).max(255),
        pdf_base64: z.string().min(10).max(8_000_000), // ~6MB pdf
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY manquant.");

    const buf = Buffer.from(data.pdf_base64, "base64");
    if (buf.length > 6 * 1024 * 1024) {
      throw new Error("Le PDF doit faire moins de 6 Mo pour la démo.");
    }

    const { createLovableAiGatewayProvider } = await import(
      "@/lib/ai-gateway.server"
    );
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const sys =
      "Tu es un expert en analyse de catalogues promotionnels de grande distribution alimentaire en France. Tu réponds UNIQUEMENT en JSON valide, sans markdown.";
    const prompt = `Analyse ce catalogue promotionnel PDF et extrais jusqu'à 12 promotions les plus pertinentes pour les réseaux sociaux (produits frais, marques connues, promos fortes, saisonniers).
Pour chaque promotion renvoie :
- product_name (obligatoire)
- promo_price (nombre €, ou null)
- old_price (nombre €, ou null)
- discount_percent (entier, ou null)
- category (court : "Fruits et légumes", "Boucherie", "Épicerie", "Crèmerie", "Boissons", "Surgelés", "Hygiène", "Autre")

Format strict :
{ "promotions": [ { ... } ] }`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: sys,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "file", data: buf, mediaType: "application/pdf" },
          ],
        },
      ],
    });

    const parsed = analysisSchema.parse(parseJsonLoose(text));
    return parsed.promotions;
  });

// ------ Anonymous: caption generation ------
export const generateAnonymousContentsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        promotions: z.array(detectedPromoSchema).min(1).max(12),
        banner: z.string().max(80).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY manquant.");

    const { createLovableAiGatewayProvider } = await import(
      "@/lib/ai-gateway.server"
    );
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const sys =
      "Tu es expert en social media pour la grande distribution alimentaire en France. Tu écris des posts Facebook courts (2-4 lignes), engageants, avec 1-2 emojis et 2-3 hashtags pertinents. Réponds UNIQUEMENT en JSON valide.";

    const promoList = data.promotions
      .map(
        (p, i) =>
          `${i + 1}. ${p.product_name}${
            p.promo_price != null ? ` — ${p.promo_price}€` : ""
          }${p.old_price != null ? ` (au lieu de ${p.old_price}€)` : ""}${
            p.discount_percent != null ? ` (-${p.discount_percent}%)` : ""
          }${p.category ? ` [${p.category}]` : ""}`,
      )
      .join("\n");

    const prompt = `Magasin : ${data.banner ?? "magasin alimentaire"}.
Voici ${data.promotions.length} promotions. Pour chacune, rédige un post Facebook prêt à publier.

${promoList}

Format strict :
{ "posts": [ { "index": 1, "caption": "..." }, { "index": 2, "caption": "..." } ] }`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: sys,
      prompt,
    });

    const out = z
      .object({
        posts: z.array(
          z.object({
            index: z.number().int().min(1),
            caption: z.string().min(1).max(2000),
          }),
        ),
      })
      .parse(parseJsonLoose(text));

    // Map back to promotions order
    return data.promotions.map((p, i) => ({
      product_name: p.product_name,
      caption:
        out.posts.find((o) => o.index === i + 1)?.caption ??
        out.posts[i]?.caption ??
        "",
    }));
  });

// ------ Authenticated: migrate onboarding data after signup ------
const migrateSchema = z.object({
  store: z.object({
    name: z.string().trim().min(1).max(120),
    banner: z.string().min(1).max(80),
    city: z.string().trim().max(120).optional().nullable(),
  }),
  promotions: z
    .array(
      detectedPromoSchema.extend({
        caption: z.string().max(2000).optional().nullable(),
      }),
    )
    .max(12),
});

export const migrateOnboardingDataFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => migrateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Upsert store
    const existing = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    let storeId: string;
    if (existing.data) {
      storeId = existing.data.id;
      await supabase
        .from("stores")
        .update({
          name: data.store.name,
          banner: data.store.banner,
          store_brand: data.store.banner,
          city: data.store.city ?? null,
        })
        .eq("id", storeId);
    } else {
      const ins = await supabase
        .from("stores")
        .insert({
          user_id: userId,
          name: data.store.name,
          banner: data.store.banner,
          store_brand: data.store.banner,
          city: data.store.city ?? null,
          strong_departments: [],
        })
        .select("id")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      storeId = ins.data.id;
    }

    // 2. Insert promotions + linked generated_contents
    let saved = 0;
    for (const p of data.promotions) {
      const promo = await supabase
        .from("promotions")
        .insert({
          user_id: userId,
          store_id: storeId,
          product_name: p.product_name,
          price: p.promo_price ?? null,
          old_price: p.old_price ?? null,
          category: p.category ?? null,
        })
        .select("id")
        .single();
      if (promo.error) continue;
      saved += 1;

      if (p.caption && p.caption.trim().length > 0) {
        await supabase.from("generated_contents").insert({
          user_id: userId,
          store_id: storeId,
          promotion_id: promo.data.id,
          content_type: "facebook_post",
          content_text: p.caption,
        });
      }
    }

    return { store_id: storeId, promotions_saved: saved };
  });
