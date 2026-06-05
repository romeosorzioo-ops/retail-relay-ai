import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listContentsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { pool } = await import("@/lib/lovable/database");
    const { rows } = await pool.query(
      `SELECT gc.*, p.product_name as promo_name
       FROM generated_contents gc
       LEFT JOIN promotions p ON p.id = gc.promotion_id
       WHERE gc.user_id=$1 ORDER BY gc.created_at DESC`,
      [context.userId],
    );
    return rows;
  });

export const deleteContentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { pool } = await import("@/lib/lovable/database");
    await pool.query(
      "DELETE FROM generated_contents WHERE id=$1 AND user_id=$2",
      [data.id, context.userId],
    );
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
    const { pool } = await import("@/lib/lovable/database");
    const { rows } = await pool.query(
      `UPDATE generated_contents
       SET facebook_post=$1, instagram_post=$2, instagram_story=$3, reel_idea=$4
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [
        data.facebook_post,
        data.instagram_post,
        data.instagram_story,
        data.reel_idea,
        data.id,
        context.userId,
      ],
    );
    return rows[0];
  });

export const generateContentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ promotion_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { pool } = await import("@/lib/lovable/database");

    const store = (
      await pool.query("SELECT * FROM stores WHERE user_id=$1 LIMIT 1", [
        context.userId,
      ])
    ).rows[0];
    const promo = (
      await pool.query(
        "SELECT * FROM promotions WHERE id=$1 AND user_id=$2 LIMIT 1",
        [data.promotion_id, context.userId],
      )
    ).rows[0];

    if (!store) throw new Error("Configurez d'abord votre profil magasin.");
    if (!promo) throw new Error("Promotion introuvable.");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY manquant.");

    const { createLovableAiGatewayProvider } = await import(
      "@/lib/ai-gateway.server"
    );
    const { generateText, Output } = await import("ai");
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
    const { rows } = await pool.query(
      `INSERT INTO generated_contents (user_id, promotion_id, facebook_post, instagram_post, instagram_story, reel_idea)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        context.userId,
        promo.id,
        out.facebook_post,
        out.instagram_post,
        out.instagram_story,
        out.reel_idea,
      ],
    );
    return rows[0];
  });
