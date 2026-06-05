import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_SIZE = 30 * 1024 * 1024;

export const listCatalogImportsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("catalog_imports")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const uploadCatalogFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        file_name: z.string().min(1).max(255),
        data_base64: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const buffer = Buffer.from(data.data_base64, "base64");
    if (buffer.byteLength > MAX_SIZE) {
      throw new Error("Le fichier dépasse 30 Mo.");
    }
    const store = await context.supabase
      .from("stores")
      .select("id")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    const safe = data.file_name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const path = `${context.userId}/catalogs/${Date.now()}-${safe}`;
    const { error: upErr } = await context.supabase.storage
      .from("promotion-files")
      .upload(path, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upErr) throw new Error(upErr.message);
    const { data: pub } = context.supabase.storage
      .from("promotion-files")
      .getPublicUrl(path);
    const { data: row, error } = await context.supabase
      .from("catalog_imports")
      .insert({
        user_id: context.userId,
        store_id: store.data?.id ?? null,
        file_url: pub.publicUrl,
        file_name: data.file_name,
        file_size: buffer.byteLength,
        status: "uploaded",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCatalogImportFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("catalog_imports")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCatalogPromotionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ catalog_import_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("catalog_promotions")
      .select("*")
      .eq("catalog_import_id", data.catalog_import_id)
      .eq("user_id", context.userId)
      .order("social_score", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const promoExtractedSchema = z.object({
  product_name: z.string().min(1).max(300),
  promo_price: z.number().nullable().optional(),
  old_price: z.number().nullable().optional(),
  discount_percent: z.number().nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  page_number: z.number().int().nullable().optional(),
  social_score: z.number().int().min(0).max(100).nullable().optional(),
  recommendation_reason: z.string().max(500).nullable().optional(),
});
const promosArraySchema = z.object({
  promotions: z.array(promoExtractedSchema).max(200),
});

function parseJsonLoose(text: string) {
  const t = text.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate =
    fenced?.[1] ?? t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

export const analyzeCatalogFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ catalog_import_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: imp, error: impErr } = await context.supabase
      .from("catalog_imports")
      .select("*")
      .eq("id", data.catalog_import_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (impErr) throw new Error(impErr.message);
    if (!imp) throw new Error("Catalogue introuvable.");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY manquant.");

    await context.supabase
      .from("catalog_imports")
      .update({ status: "analyzing", error_message: null })
      .eq("id", imp.id);

    try {
      const fileRes = await fetch(imp.file_url);
      if (!fileRes.ok) throw new Error("Téléchargement du PDF impossible.");
      const pdfBuffer = new Uint8Array(await fileRes.arrayBuffer());

      const { createLovableAiGatewayProvider } = await import(
        "@/lib/ai-gateway.server"
      );
      const { generateText } = await import("ai");
      const gateway = createLovableAiGatewayProvider(key);

      const storeRes = await context.supabase
        .from("stores")
        .select("name, banner, city")
        .eq("user_id", context.userId)
        .limit(1)
        .maybeSingle();
      const store = storeRes.data;

      const sys = `Tu es un expert en analyse de catalogues promotionnels GMS (grande distribution) en France. Tu extrais les promotions de manière exhaustive depuis le PDF fourni. Tu réponds UNIQUEMENT en JSON valide.`;
      const prompt = `Analyse ce catalogue promotionnel${store ? ` du magasin ${store.name} (${store.banner})` : ""} et extrais TOUTES les promotions visibles.

Pour chaque promotion, renvoie:
- product_name (texte, obligatoire)
- promo_price (nombre en euros, ou null)
- old_price (nombre en euros, ou null)
- discount_percent (entier, ou null)
- category (texte court: "Fruits et légumes", "Boucherie", "Épicerie", "Crèmerie", "Boissons", "Surgelés", "Hygiène", "Local", "Saisonnier", "Autre")
- start_date (YYYY-MM-DD ou null)
- end_date (YYYY-MM-DD ou null)
- page_number (entier ou null)
- social_score (entier 0-100): pertinence pour les réseaux sociaux. Score élevé pour: produits frais locaux, promos fortes (>30%), produits saisonniers, marques connues, prix choc, coups de cœur.
- recommendation_reason (1 phrase courte expliquant le score)

Réponds avec un JSON strict de la forme:
{ "promotions": [ { ... }, { ... } ] }
Pas de markdown, pas de texte autour.`;

      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: sys,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "file",
                data: pdfBuffer,
                mediaType: "application/pdf",
              },
            ],
          },
        ],
      });

      let parsed: z.infer<typeof promosArraySchema>;
      try {
        parsed = promosArraySchema.parse(parseJsonLoose(text));
      } catch {
        throw new Error("Réponse IA illisible. Réessayez.");
      }

      await context.supabase
        .from("catalog_promotions")
        .delete()
        .eq("catalog_import_id", imp.id)
        .eq("user_id", context.userId);

      const storeId = imp.store_id;
      const rows = parsed.promotions.map((p) => ({
        catalog_import_id: imp.id,
        user_id: context.userId,
        store_id: storeId,
        product_name: p.product_name,
        promo_price: p.promo_price ?? null,
        old_price: p.old_price ?? null,
        discount_percent: p.discount_percent ?? null,
        category: p.category ?? null,
        start_date: p.start_date ?? null,
        end_date: p.end_date ?? null,
        page_number: p.page_number ?? null,
        social_score: p.social_score ?? null,
        recommendation_reason: p.recommendation_reason ?? null,
        selected: false,
      }));
      if (rows.length > 0) {
        const { error: insErr } = await context.supabase
          .from("catalog_promotions")
          .insert(rows);
        if (insErr) throw new Error(insErr.message);
      }

      await context.supabase
        .from("catalog_imports")
        .update({ status: "analyzed" })
        .eq("id", imp.id);

      return { ok: true, count: rows.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analyse échouée";
      await context.supabase
        .from("catalog_imports")
        .update({ status: "failed", error_message: msg })
        .eq("id", imp.id);
      throw new Error(msg);
    }
  });

export const updateCatalogPromotionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        product_name: z.string().min(1).max(300).optional(),
        promo_price: z.number().nullable().optional(),
        old_price: z.number().nullable().optional(),
        discount_percent: z.number().nullable().optional(),
        category: z.string().max(120).nullable().optional(),
        start_date: z.string().nullable().optional(),
        end_date: z.string().nullable().optional(),
        selected: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("catalog_promotions")
      .update(patch)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const campaignSchema = z.object({
  recommended_format: z.enum(["post", "story", "reel", "carousel"]),
  recommended_platform: z.enum(["facebook", "instagram", "both"]),
  recommended_date: z.string().nullable().optional(),
  recommended_time: z.string().nullable().optional(),
  creative_angle: z.string().max(500),
  visual_brief: z.string().max(500),
  caption: z.string().max(2200),
});

export const generateCampaignFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ catalog_import_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: promos, error } = await context.supabase
      .from("catalog_promotions")
      .select("*")
      .eq("catalog_import_id", data.catalog_import_id)
      .eq("user_id", context.userId)
      .eq("selected", true);
    if (error) throw new Error(error.message);
    if (!promos || promos.length === 0)
      throw new Error("Sélectionnez au moins une promotion.");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY manquant.");
    const { createLovableAiGatewayProvider } = await import(
      "@/lib/ai-gateway.server"
    );
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const storeRes = await context.supabase
      .from("stores")
      .select("*")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    const store = storeRes.data;

    await context.supabase
      .from("campaign_recommendations")
      .delete()
      .in(
        "catalog_promotion_id",
        promos.map((p) => p.id),
      )
      .eq("user_id", context.userId);

    const out: any[] = [];
    for (const p of promos) {
      const sys = `Tu es un expert en marketing local pour GMS en France. Tu rédiges des recommandations de campagne réseaux sociaux. Réponds UNIQUEMENT en JSON valide.`;
      const prompt = `Magasin: ${store?.name ?? "-"} (${store?.banner ?? "-"}) à ${store?.city ?? "-"}
Ton: ${store?.tone ?? "professionnel"}

Promotion à promouvoir:
- Produit: ${p.product_name}
- Prix promo: ${p.promo_price ?? "-"} € (au lieu de ${p.old_price ?? "-"} €)
- Remise: ${p.discount_percent ?? "-"}%
- Catégorie: ${p.category ?? "-"}
- Période: ${p.start_date ?? "-"} → ${p.end_date ?? "-"}

Recommande UNE campagne optimale:
{
  "recommended_format": "post" | "story" | "reel" | "carousel",
  "recommended_platform": "facebook" | "instagram" | "both",
  "recommended_date": "YYYY-MM-DD (dans la période de validité, jour à fort trafic GMS)",
  "recommended_time": "HH:MM (créneau d'engagement optimal pour le réseau et la catégorie)",
  "creative_angle": "angle créatif court",
  "visual_brief": "brief visuel court (composition, ambiance, éléments)",
  "caption": "texte de publication final prêt à publier avec emojis et hashtags locaux pertinents"
}
Pas de markdown.`;
      try {
        const { text } = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system: sys,
          prompt,
        });
        const reco = campaignSchema.parse(parseJsonLoose(text));
        const { data: row } = await context.supabase
          .from("campaign_recommendations")
          .insert({
            catalog_promotion_id: p.id,
            user_id: context.userId,
            store_id: p.store_id,
            recommended_format: reco.recommended_format,
            recommended_platform: reco.recommended_platform,
            recommended_date: reco.recommended_date ?? null,
            recommended_time: reco.recommended_time ?? null,
            creative_angle: reco.creative_angle,
            visual_brief: reco.visual_brief,
            caption: reco.caption,
            status: "draft",
          })
          .select("*")
          .single();
        if (row) out.push(row);
      } catch {
        // skip failing promo
      }
    }
    return { ok: true, count: out.length };
  });

export const listCampaignRecommendationsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ catalog_import_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: promos } = await context.supabase
      .from("catalog_promotions")
      .select("id, product_name, promo_price, old_price, category")
      .eq("catalog_import_id", data.catalog_import_id)
      .eq("user_id", context.userId);
    const ids = (promos ?? []).map((p) => p.id);
    if (ids.length === 0) return [];
    const { data: recos, error } = await context.supabase
      .from("campaign_recommendations")
      .select("*")
      .eq("user_id", context.userId)
      .in("catalog_promotion_id", ids)
      .order("recommended_date", { ascending: true });
    if (error) throw new Error(error.message);
    const byId = new Map((promos ?? []).map((p) => [p.id, p]));
    return (recos ?? []).map((r) => ({
      ...r,
      promotion: byId.get(r.catalog_promotion_id) ?? null,
    }));
  });

export const addCampaignToCalendarFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ catalog_import_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: promos } = await context.supabase
      .from("catalog_promotions")
      .select("id, store_id")
      .eq("catalog_import_id", data.catalog_import_id)
      .eq("user_id", context.userId);
    const ids = (promos ?? []).map((p) => p.id);
    if (ids.length === 0) throw new Error("Aucune promotion à planifier.");
    const { data: recos, error } = await context.supabase
      .from("campaign_recommendations")
      .select("*")
      .eq("user_id", context.userId)
      .in("catalog_promotion_id", ids);
    if (error) throw new Error(error.message);

    let created = 0;
    for (const r of recos ?? []) {
      const platforms =
        r.recommended_platform === "both"
          ? ["facebook", "instagram"]
          : [r.recommended_platform ?? "facebook"];
      const date = r.recommended_date ?? new Date().toISOString().slice(0, 10);
      const time = (r.recommended_time ?? "10:00").slice(0, 5);
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      const post_type =
        r.recommended_format === "story"
          ? "story"
          : r.recommended_format === "reel"
            ? "reel"
            : "post";
      const { data: sp } = await context.supabase
        .from("scheduled_posts")
        .insert({
          user_id: context.userId,
          store_id: r.store_id ?? null,
          platforms,
          post_type,
          caption: r.caption ?? "",
          scheduled_at,
          status: "draft",
        })
        .select("id")
        .single();
      if (sp) {
        await context.supabase
          .from("campaign_recommendations")
          .update({ status: "scheduled", scheduled_post_id: sp.id })
          .eq("id", r.id);
        created++;
      }
    }
    return { ok: true, created };
  });
