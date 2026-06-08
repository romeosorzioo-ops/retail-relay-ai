import { createFileRoute } from "@tanstack/react-router";

const KNOWN_BRANDS = [
  "coca-cola", "coca cola", "pepsi", "pringles", "nutella", "huggies", "pampers",
  "danone", "nestle", "nestlé", "kinder", "ferrero", "oreo", "lay's", "lays",
  "haribo", "lu", "président", "president", "lactel", "evian", "perrier",
  "heineken", "kronenbourg", "1664", "ricard", "absolut", "jack daniel",
  "kellogg", "milka", "lindt", "bonduelle", "knorr", "maggi", "barilla",
  "panzani", "activia", "yoplait", "saint-michel",
];

export function isBrandedProduct(name: string): boolean {
  const lower = name.toLowerCase();
  return KNOWN_BRANDS.some((b) => lower.includes(b));
}

function buildPrompt(input: {
  productName: string;
  category?: string | null;
  rayon?: string | null;
  storeContext?: string | null;
}): string {
  const { productName, category, rayon } = input;
  const ctx = [category, rayon].filter(Boolean).join(", ");
  return [
    `Photographie produit ultra-réaliste de : ${productName}.`,
    ctx ? `Catégorie : ${ctx}.` : "",
    "Style : photo culinaire / commerciale haute qualité, lumière naturelle douce, fond neutre épuré (blanc cassé ou bois clair), composition centrée, mise au point nette, couleurs appétissantes.",
    "Le produit doit être SEUL au centre de l'image, sans aucun texte, sans prix, sans logo, sans étiquette de marque, sans packaging de marque inventé, sans emballage commercial. Pas de filigrane.",
    "Format carré, qualité magazine, rendu professionnel digne d'un catalogue de grande surface.",
  ]
    .filter(Boolean)
    .join(" ");
}

export const Route = createFileRoute("/api/generate-product-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            productName?: string;
            category?: string | null;
            rayon?: string | null;
            storeContext?: string | null;
          };

          if (!body?.productName || typeof body.productName !== "string") {
            return Response.json(
              { error: "productName requis" },
              { status: 400 },
            );
          }

          if (isBrandedProduct(body.productName)) {
            return Response.json(
              {
                error: "branded_product",
                message:
                  "Pour les produits de marque, utilisez l'image catalogue ou importez une photo produit.",
              },
              { status: 422 },
            );
          }

          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return Response.json(
              { error: "LOVABLE_API_KEY manquante" },
              { status: 500 },
            );
          }

          const prompt = buildPrompt({
            productName: body.productName,
            category: body.category,
            rayon: body.rayon,
            storeContext: body.storeContext,
          });

          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/images/generations",
            {
              method: "POST",
              headers: {
                "Lovable-API-Key": key,
                "Content-Type": "application/json",
                "X-Lovable-AIG-SDK": "vercel-ai-sdk",
              },
              body: JSON.stringify({
                model: "openai/gpt-image-2",
                prompt,
                quality: "low",
                size: "1024x1024",
                n: 1,
              }),
            },
          );

          if (!upstream.ok) {
            const txt = await upstream.text().catch(() => "");
            return Response.json(
              { error: "upstream_error", status: upstream.status, message: txt },
              { status: upstream.status },
            );
          }

          const data = (await upstream.json()) as {
            data?: Array<{ b64_json?: string }>;
          };
          const b64 = data?.data?.[0]?.b64_json;
          if (!b64) {
            return Response.json(
              { error: "no_image_returned" },
              { status: 500 },
            );
          }

          return Response.json({ dataUrl: `data:image/png;base64,${b64}` });
        } catch (e) {
          console.error("generate-product-image error", e);
          return Response.json(
            { error: "internal_error", message: String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});
