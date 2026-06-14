import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  assertAllowedMime,
  assertBase64SizeWithin,
} from "@/lib/upload-validation";

const MAX_SIZE = 30 * 1024 * 1024;
const CATALOG_ANALYSIS_MODEL = "google/gemini-2.5-flash";
const CATALOG_ANALYSIS_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const CATALOG_ANALYSIS_PROVIDER = "Lovable Gateway / Gemini";
const ESTIMATED_CATALOG_ANALYSIS_COST_PER_PAGE_EUR = 0.002;

function getErrorStatus(error: unknown) {
  const e = error as { status?: unknown; statusCode?: unknown; response?: { status?: unknown }; message?: unknown };
  const status = e?.statusCode ?? e?.status ?? e?.response?.status;
  if (typeof status === "number") return status;
  const message = typeof e?.message === "string" ? e.message : String(error);
  if (/payment required/i.test(message)) return 402;
  return null;
}

function formatRawError(error: unknown) {
  const e = error as {
    name?: unknown;
    message?: unknown;
    stack?: unknown;
    responseBody?: unknown;
    data?: unknown;
    cause?: unknown;
  };
  return {
    name: typeof e?.name === "string" ? e.name : "UnknownError",
    message: typeof e?.message === "string" ? e.message : String(error),
    status: getErrorStatus(error),
    responseBody: e?.responseBody ?? e?.data ?? null,
    cause: e?.cause ? String(e.cause) : null,
    stack: typeof e?.stack === "string" ? e.stack : null,
  };
}

function logCatalogAiDiagnostic(args: {
  functionCalled: string;
  catalogImportId?: string;
  pageNumber?: number;
  error?: unknown;
  phase?: "start" | "success" | "error";
  extra?: Record<string, unknown>;
}) {
  const raw = args.error ? formatRawError(args.error) : null;
  console[args.error ? "error" : "log"]("[catalog-ai-diagnostic]", {
    phase: args.phase ?? (args.error ? "error" : "start"),
    functionCalled: args.functionCalled,
    provider: CATALOG_ANALYSIS_PROVIDER,
    model: CATALOG_ANALYSIS_MODEL,
    endpoint: CATALOG_ANALYSIS_ENDPOINT,
    catalogImportId: args.catalogImportId ?? null,
    pageNumber: args.pageNumber ?? null,
    httpStatus: raw?.status ?? null,
    rawErrorMessage: raw?.message ?? null,
    rawResponseBody: raw?.responseBody ?? null,
    stackTrace: raw?.stack ?? null,
    ...args.extra,
  });
}

/**
 * Guard against SSRF: catalog imports are uploaded through our own server fn
 * which writes them to the `promotion-files` Supabase bucket, so the file URL
 * must always live under that bucket. Reject anything else before fetching.
 */
function assertOwnedStorageUrl(fileUrl: string): void {
  const projectRef =
    process.env.SUPABASE_PROJECT_ID ??
    (process.env.SUPABASE_URL ?? "")
      .replace(/^https?:\/\//, "")
      .split(".")[0];
  if (!projectRef) {
    throw new Error("Configuration Supabase manquante.");
  }
  const allowedPrefix = `https://${projectRef}.supabase.co/storage/v1/object/public/promotion-files/`;
  if (!fileUrl.startsWith(allowedPrefix)) {
    throw new Error("URL de fichier invalide.");
  }
}

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

    // Determine page count
    let pageCount = 0;
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = pdf.getPageCount();
    } catch {
      pageCount = 0;
    }

    const { data: row, error } = await context.supabase
      .from("catalog_imports")
      .insert({
        user_id: context.userId,
        store_id: store.data?.id ?? null,
        file_url: pub.publicUrl,
        file_name: data.file_name,
        file_size: buffer.byteLength,
        page_count: pageCount,
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
      .order("page_number", { ascending: true, nullsFirst: false })
      .order("social_score", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listCatalogPagesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ catalog_import_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("catalog_pages")
      .select("*")
      .eq("catalog_import_id", data.catalog_import_id)
      .eq("user_id", context.userId)
      .order("page_number", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const bboxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
const promoExtractedSchema = z.object({
  product_name: z.string().min(1).max(300),
  promo_price: z.number().nullable().optional(),
  old_price: z.number().nullable().optional(),
  discount_percent: z.number().nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  social_score: z.number().int().min(0).max(100).nullable().optional(),
  confidence: z.number().int().min(0).max(100).nullable().optional(),
  recommendation_reason: z.string().max(500).nullable().optional(),
  missing_fields: z.array(z.string().max(60)).max(20).nullable().optional(),
  bbox: bboxSchema.nullable().optional(),
});
const pageAnalysisSchema = z.object({
  promotions: z.array(promoExtractedSchema).max(200),
  notes: z.string().max(800).nullable().optional(),
});


function parseJsonLoose(text: string) {
  const t = text.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate =
    fenced?.[1] ?? t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

async function extractSinglePagePdf(
  fullPdf: Uint8Array,
  pageIndex: number,
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const src = await PDFDocument.load(fullPdf, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const [copied] = await out.copyPages(src, [pageIndex]);
  out.addPage(copied);
  return await out.save();
}

async function analyzeSinglePage(args: {
  context: any;
  imp: any;
  pageNumber: number; // 1-indexed
  fullPdf: Uint8Array;
  store: any;
  apiKey: string;
}) {
  const { context, imp, pageNumber, fullPdf, store, apiKey } = args;
  const startedAt = Date.now();
  logCatalogAiDiagnostic({
    functionCalled: "analyzeSinglePage",
    catalogImportId: imp.id,
    pageNumber,
    phase: "start",
  });

  // mark page as analyzing
  await context.supabase
    .from("catalog_pages")
    .upsert(
      {
        catalog_import_id: imp.id,
        user_id: context.userId,
        page_number: pageNumber,
        status: "analyzing",
        error_message: null,
      },
      { onConflict: "catalog_import_id,page_number" },
    );

  try {
    const pageBuf = await extractSinglePagePdf(fullPdf, pageNumber - 1);

    const { createLovableAiGatewayProvider } = await import(
      "@/lib/ai-gateway.server"
    );
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const sys = `Tu es un expert en analyse de catalogues promotionnels GMS (grande distribution) en France. Tu analyses UNE seule page d'un catalogue à la fois et tu cherches de manière EXHAUSTIVE toutes les promotions visibles, même si le prix est écrit en gros, le nom produit petit, l'ancien prix barré, ou la remise est dans un badge. Plusieurs produits peuvent être sur la même page. Tu réponds UNIQUEMENT en JSON valide.`;
    const prompt = `Analyse UNIQUEMENT cette page (page ${pageNumber}) du catalogue${store ? ` du magasin ${store.name} (${store.banner ?? "-"})` : ""}.

Extrais TOUTES les promotions visibles sans en oublier. Pour chacune, renvoie:
- product_name (texte, obligatoire)
- promo_price (nombre en euros, ou null)
- old_price (nombre en euros barré, ou null)
- discount_percent (entier, ou null)
- category (court: "Fruits et légumes", "Boucherie", "Épicerie", "Crèmerie", "Boissons", "Surgelés", "Hygiène", "Local", "Saisonnier", "Autre")
- start_date / end_date (YYYY-MM-DD ou null)
- social_score (0-100): pertinence réseaux sociaux (frais local, promo forte, saisonnier, marque connue)
- confidence (0-100): à quel point tu es certain de cette détection
- recommendation_reason (1 phrase courte)
- missing_fields: liste des champs que tu n'as PAS pu lire avec certitude
- bbox: cadre englobant la promo (photo produit + nom + prix + remise) en coordonnées NORMALISÉES 0-1 relatives à la page : { "x": 0.0-1.0, "y": 0.0-1.0, "width": 0.0-1.0, "height": 0.0-1.0 }. (0,0) = coin haut-gauche. Le cadre doit englober toute la zone de la promo, photo comprise, sans déborder hors page. Si tu ne peux pas localiser la promo, mets bbox à null.

Ajoute aussi un champ "notes" (string) listant brièvement les zones de la page que tu n'as pas pu analyser ou qui sont ambiguës.

Format strict:
{ "promotions": [ { ... }, ... ], "notes": "..." }
Pas de markdown, pas de texte autour.`;


    const { text } = await generateText({
        model: gateway(CATALOG_ANALYSIS_MODEL),
      system: sys,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "file",
              data: pageBuf,
              mediaType: "application/pdf",
            },
          ],
        },
      ],
    });

    const parsed = pageAnalysisSchema.parse(parseJsonLoose(text));

    // remove existing AI promos for this page
    await context.supabase
      .from("catalog_promotions")
      .delete()
      .eq("catalog_import_id", imp.id)
      .eq("user_id", context.userId)
      .eq("page_number", pageNumber)
      .eq("detection_source", "ai");

    const rows = parsed.promotions.map((p) => ({
      catalog_import_id: imp.id,
      user_id: context.userId,
      store_id: imp.store_id,
      product_name: p.product_name,
      promo_price: p.promo_price ?? null,
      old_price: p.old_price ?? null,
      discount_percent: p.discount_percent ?? null,
      category: p.category ?? null,
      start_date: p.start_date ?? null,
      end_date: p.end_date ?? null,
      page_number: pageNumber,
      social_score: p.social_score ?? null,
      confidence: p.confidence ?? null,
      recommendation_reason: p.recommendation_reason ?? null,
      missing_fields: p.missing_fields ?? null,
      crop_coordinates: p.bbox ?? null,
      detection_source: "ai",
      selected: false,
    }));

    if (rows.length > 0) {
      const { error: insErr } = await context.supabase
        .from("catalog_promotions")
        .insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

    await context.supabase
      .from("catalog_pages")
      .update({
        status: "analyzed",
        promotions_count: rows.length,
        notes: parsed.notes ?? null,
        analyzed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("catalog_import_id", imp.id)
      .eq("page_number", pageNumber)
      .eq("user_id", context.userId);

    logCatalogAiDiagnostic({
      functionCalled: "analyzeSinglePage",
      catalogImportId: imp.id,
      pageNumber,
      phase: "success",
      extra: { promotionsDetected: rows.length, durationMs: Date.now() - startedAt },
    });

    return { count: rows.length };
  } catch (e) {
    const raw = formatRawError(e);
    const msg = raw.message || "Analyse de page échouée";
    logCatalogAiDiagnostic({
      functionCalled: "analyzeSinglePage",
      catalogImportId: imp.id,
      pageNumber,
      phase: "error",
      error: e,
      extra: { durationMs: Date.now() - startedAt },
    });
    await context.supabase
      .from("catalog_pages")
      .update({
        status: "failed",
        error_message: msg,
        notes: JSON.stringify({
          functionCalled: "analyzeSinglePage",
          provider: CATALOG_ANALYSIS_PROVIDER,
          model: CATALOG_ANALYSIS_MODEL,
          endpoint: CATALOG_ANALYSIS_ENDPOINT,
          httpStatus: raw.status,
          rawErrorMessage: raw.message,
          stackTrace: raw.stack,
        }).slice(0, 780),
      })
      .eq("catalog_import_id", imp.id)
      .eq("page_number", pageNumber)
      .eq("user_id", context.userId);
    throw e;
  }
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
      assertOwnedStorageUrl(imp.file_url);
      const fileRes = await fetch(imp.file_url);
      if (!fileRes.ok) throw new Error("Téléchargement du PDF impossible.");
      const pdfBuffer = new Uint8Array(await fileRes.arrayBuffer());

      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();

      await context.supabase
        .from("catalog_imports")
        .update({ page_count: pageCount })
        .eq("id", imp.id);

      // reset previous AI promos and pages
      await context.supabase
        .from("catalog_promotions")
        .delete()
        .eq("catalog_import_id", imp.id)
        .eq("user_id", context.userId)
        .eq("detection_source", "ai");
      await context.supabase
        .from("catalog_pages")
        .delete()
        .eq("catalog_import_id", imp.id)
        .eq("user_id", context.userId);

      const storeRes = await context.supabase
        .from("stores")
        .select("name, banner, city")
        .eq("user_id", context.userId)
        .limit(1)
        .maybeSingle();
      const store = storeRes.data;

      let total = 0;
      let failedPages = 0;
      for (let i = 1; i <= pageCount; i++) {
        try {
          const r = await analyzeSinglePage({
            context,
            imp,
            pageNumber: i,
            fullPdf: pdfBuffer,
            store,
            apiKey: key,
          });
          total += r.count;
        } catch (pageError) {
          failedPages++;
          logCatalogAiDiagnostic({
            functionCalled: "analyzeCatalogFn.loop",
            catalogImportId: imp.id,
            pageNumber: i,
            phase: "error",
            error: pageError,
          });
          // continue to next page
        }
      }

      if (failedPages === pageCount && pageCount > 0) {
        throw new Error(
          "Analyse catalogue impossible : toutes les pages ont échoué. Consultez le debug admin.",
        );
      }

      await context.supabase
        .from("catalog_imports")
        .update({
          status: failedPages > 0 ? "analyzed" : "analyzed",
          error_message: failedPages > 0 ? `${failedPages} page(s) en échec.` : null,
        })
        .eq("id", imp.id);

      return { ok: true, count: total, pages: pageCount, failedPages };
    } catch (e) {
      const raw = formatRawError(e);
      const msg = raw.message || "Analyse échouée";
      logCatalogAiDiagnostic({
        functionCalled: "analyzeCatalogFn",
        catalogImportId: imp.id,
        phase: "error",
        error: e,
      });
      await context.supabase
        .from("catalog_imports")
        .update({ status: "failed", error_message: msg })
        .eq("id", imp.id);
      throw new Error(msg);
    }
  });

export const reanalyzeCatalogPageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        catalog_import_id: z.string().uuid(),
        page_number: z.number().int().min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: imp } = await context.supabase
      .from("catalog_imports")
      .select("*")
      .eq("id", data.catalog_import_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!imp) throw new Error("Catalogue introuvable.");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY manquant.");
    assertOwnedStorageUrl(imp.file_url);
    const fileRes = await fetch(imp.file_url);
    if (!fileRes.ok) throw new Error("Téléchargement du PDF impossible.");
    const pdfBuffer = new Uint8Array(await fileRes.arrayBuffer());
    const storeRes = await context.supabase
      .from("stores")
      .select("name, banner, city")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    const r = await analyzeSinglePage({
      context,
      imp,
      pageNumber: data.page_number,
      fullPdf: pdfBuffer,
      store: storeRes.data,
      apiKey: key,
    });
    return { ok: true, count: r.count };
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

export const addCatalogPromotionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        catalog_import_id: z.string().uuid(),
        page_number: z.number().int().min(1).max(500).nullable().optional(),
        product_name: z.string().min(1).max(300),
        promo_price: z.number().nullable().optional(),
        old_price: z.number().nullable().optional(),
        discount_percent: z.number().nullable().optional(),
        category: z.string().max(120).nullable().optional(),
        start_date: z.string().nullable().optional(),
        end_date: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: imp } = await context.supabase
      .from("catalog_imports")
      .select("id, store_id")
      .eq("id", data.catalog_import_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!imp) throw new Error("Catalogue introuvable.");
    const { data: row, error } = await context.supabase
      .from("catalog_promotions")
      .insert({
        catalog_import_id: imp.id,
        user_id: context.userId,
        store_id: imp.store_id,
        page_number: data.page_number ?? null,
        product_name: data.product_name,
        promo_price: data.promo_price ?? null,
        old_price: data.old_price ?? null,
        discount_percent: data.discount_percent ?? null,
        category: data.category ?? null,
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        detection_source: "manual",
        confidence: 100,
        selected: false,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCatalogPromotionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("catalog_promotions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const campaignSchema = z.object({
  recommended_format: z.enum(["ig_square", "ig_portrait", "story"]),
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

Recommande UNE campagne optimale. Komaag ne gère que des visuels statiques (pas de vidéo, pas de Reel). Choisis le format selon ces règles:
- Promotion simple → "ig_square" (Post carré 1080x1080)
- Promotion importante / mise en avant → "ig_portrait" (Post portrait 1080x1350)
- Communication rapide / éphémère → "story" (Story 1080x1920)

{
  "recommended_format": "ig_square" | "ig_portrait" | "story",
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
      .select("id, store_id, product_image_url")
      .eq("catalog_import_id", data.catalog_import_id)
      .eq("user_id", context.userId);
    const ids = (promos ?? []).map((p) => p.id);
    if (ids.length === 0) throw new Error("Aucune promotion à planifier.");
    const imageByPromo = new Map(
      (promos ?? []).map((p) => [p.id, p.product_image_url ?? null]),
    );
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
      const post_type = r.recommended_format === "story" ? "story" : "post";
      const media_url = imageByPromo.get(r.catalog_promotion_id) ?? null;
      const { data: sp } = await context.supabase
        .from("scheduled_posts")
        .insert({
          user_id: context.userId,
          store_id: r.store_id ?? null,
          platforms,
          post_type,
          caption: r.caption ?? "",
          media_url,
          media_type: media_url ? "image/png" : null,
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

/* ============================================================
   Image extraction & management for catalog promotions (V1)
   ============================================================ */

async function uploadDataUrlToStorage(opts: {
  supabase: any;
  userId: string;
  importId: string;
  kind: "page" | "product";
  refId: string | number;
  dataBase64: string;
  contentType: string;
}) {
  assertAllowedMime(opts.contentType, ALLOWED_IMAGE_MIME_TYPES);
  assertBase64SizeWithin(opts.dataBase64, MAX_IMAGE_BYTES);
  const ext = opts.contentType.includes("png") ? "png" : "jpg";
  const path = `${opts.userId}/catalog-product-images/${opts.importId}/${opts.kind}-${opts.refId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(opts.dataBase64, "base64");
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Le fichier dépasse la taille maximale autorisée.");
  }
  const { error } = await opts.supabase.storage
    .from("promotion-files")
    .upload(path, buffer, { contentType: opts.contentType, upsert: false });
  if (error) throw new Error(error.message);
  const { data: pub } = opts.supabase.storage
    .from("promotion-files")
    .getPublicUrl(path);
  return pub.publicUrl as string;
}

export const savePageImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        catalog_import_id: z.string().uuid(),
        page_number: z.number().int().min(1).max(500),
        data_base64: z.string().min(1),
        content_type: z.string().max(60).default("image/png"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: imp } = await context.supabase
      .from("catalog_imports")
      .select("id")
      .eq("id", data.catalog_import_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!imp) throw new Error("Catalogue introuvable.");
    const url = await uploadDataUrlToStorage({
      supabase: context.supabase,
      userId: context.userId,
      importId: imp.id,
      kind: "page",
      refId: data.page_number,
      dataBase64: data.data_base64,
      contentType: data.content_type,
    });
    await context.supabase
      .from("catalog_pages")
      .upsert(
        {
          catalog_import_id: imp.id,
          user_id: context.userId,
          page_number: data.page_number,
          page_image_url: url,
        },
        { onConflict: "catalog_import_id,page_number" },
      );
    await context.supabase
      .from("catalog_promotions")
      .update({ page_image_url: url })
      .eq("catalog_import_id", imp.id)
      .eq("user_id", context.userId)
      .eq("page_number", data.page_number);
    return { url };
  });

export const setPromotionImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        promotion_id: z.string().uuid(),
        data_base64: z.string().min(1),
        content_type: z.string().max(60).default("image/png"),
        crop_coordinates: z
          .object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          })
          .nullable()
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: promo } = await context.supabase
      .from("catalog_promotions")
      .select("id, catalog_import_id")
      .eq("id", data.promotion_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!promo) throw new Error("Promotion introuvable.");
    const url = await uploadDataUrlToStorage({
      supabase: context.supabase,
      userId: context.userId,
      importId: promo.catalog_import_id,
      kind: "product",
      refId: promo.id,
      dataBase64: data.data_base64,
      contentType: data.content_type,
    });
    const { error } = await context.supabase
      .from("catalog_promotions")
      .update({
        product_image_url: url,
        thumbnail_url: url,
        crop_coordinates: data.crop_coordinates ?? null,
      })
      .eq("id", promo.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { url };
  });

export const clearPromotionImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ promotion_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("catalog_promotions")
      .update({ product_image_url: null, thumbnail_url: null, crop_coordinates: null })
      .eq("id", data.promotion_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPromotionCreationModeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        promotion_id: z.string().uuid(),
        creation_mode: z.enum(["catalog_visual", "field_photo"]).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("catalog_promotions")
      .update({ creation_mode: data.creation_mode })
      .eq("id", data.promotion_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCatalogPromotionFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("catalog_promotions")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Promotion introuvable.");
    return row;
  });
