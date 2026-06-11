import { createFileRoute } from "@tanstack/react-router";

/**
 * Détourage d'image produit via Lovable AI Gateway (Gemini image edit).
 * Input : { imageUrl: string (http or data URL), productLabel?: string }
 * Output: { dataUrl: string (PNG transparent) }
 */
export const Route = createFileRoute("/api/cutout-product-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            imageUrl?: string;
            productLabel?: string | null;
          };

          if (!body?.imageUrl || typeof body.imageUrl !== "string") {
            return Response.json({ error: "imageUrl requis" }, { status: 400 });
          }

          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return Response.json(
              { error: "LOVABLE_API_KEY manquante" },
              { status: 500 },
            );
          }

          // Convertir en data URL si nécessaire pour passer en image_url multimodal
          let imageDataUrl = body.imageUrl;
          if (!imageDataUrl.startsWith("data:")) {
            const r = await fetch(imageDataUrl);
            if (!r.ok) {
              return Response.json(
                { error: "fetch_image_failed", status: r.status },
                { status: 502 },
              );
            }
            const buf = Buffer.from(await r.arrayBuffer());
            const ct = r.headers.get("content-type") ?? "image/jpeg";
            imageDataUrl = `data:${ct};base64,${buf.toString("base64")}`;
          }

          const label = body.productLabel?.trim() || "le produit principal";
          const instruction = `Détoure ${label} sur cette image : supprime intégralement l'arrière-plan, garde uniquement le produit avec ses contours nets, et renvoie une image PNG à fond TRANSPARENT. Pas de texte, pas d'ombre, pas de cadre, juste le produit isolé centré.`;

          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Lovable-API-Key": key,
                "Content-Type": "application/json",
                "X-Lovable-AIG-SDK": "vercel-ai-sdk",
              },
              body: JSON.stringify({
                model: "google/gemini-3.1-flash-image-preview",
                modalities: ["image", "text"],
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: instruction },
                      { type: "image_url", image_url: { url: imageDataUrl } },
                    ],
                  },
                ],
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
            choices?: Array<{
              message?: {
                images?: Array<{ image_url?: { url?: string } }>;
                content?: unknown;
              };
            }>;
          };

          const out = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (!out) {
            return Response.json(
              { error: "no_image_returned", raw: data },
              { status: 502 },
            );
          }
          return Response.json({ dataUrl: out });
        } catch (e) {
          console.error("cutout-product-image error", e);
          return Response.json(
            { error: "internal_error", message: String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});
