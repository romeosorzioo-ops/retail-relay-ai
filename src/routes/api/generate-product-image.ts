import { createFileRoute } from "@tanstack/react-router";
import { classifyProductType, isBrandedProduct } from "@/lib/brand-detection";

function buildPrompt(input: {
  productName: string;
  category?: string | null;
  rayon?: string | null;
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
            productType?: "packaged" | "fresh" | null;
          };

          if (!body?.productName || typeof body.productName !== "string") {
            return Response.json({ error: "productName requis" }, { status: 400 });
          }

          // Garde-fou : on ne génère JAMAIS d'IA pour un produit packagé.
          // Source de vérité = productType fourni par le client ; fallback = classifier.
          const productType =
            body.productType ??
            classifyProductType(body.productName, body.category);

          if (productType === "packaged" || isBrandedProduct(body.productName)) {
            return Response.json(
              {
                error: "packaged_product",
                message:
                  "Produit packagé : l'image du catalogue est obligatoire, pas de génération IA.",
              },
              { status: 422 },
            );
          }

          const key = process.env.OPENAI_API_KEY;
          if (!key) {
            return Response.json(
              { error: "OPENAI_API_KEY manquante" },
              { status: 500 },
            );
          }

          const prompt = buildPrompt({
            productName: body.productName,
            category: body.category,
            rayon: body.rayon,
          });

          const upstream = await fetch(
            "https://api.openai.com/v1/images/generations",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-image-1",
                prompt,
                size: "1024x1024",
                n: 1,
                quality: "low",
              }),
            },
          );

          if (!upstream.ok) {
            const txt = await upstream.text().catch(() => "");
            return Response.json(
              { error: "openai_error", status: upstream.status, message: txt },
              { status: upstream.status },
            );
          }

          const data = (await upstream.json()) as {
            data?: Array<{ b64_json?: string; url?: string }>;
          };
          const b64 = data?.data?.[0]?.b64_json;
          const url = data?.data?.[0]?.url;
          if (!b64 && !url) {
            return Response.json({ error: "no_image_returned" }, { status: 500 });
          }

          return Response.json({
            dataUrl: b64 ? `data:image/png;base64,${b64}` : url,
          });
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
