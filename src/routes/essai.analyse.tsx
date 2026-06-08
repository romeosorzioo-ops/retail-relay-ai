import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ScanLine, CheckCircle2, Loader2 } from "lucide-react";
import { useTunnelStore, type TunnelProduct, type TunnelPost } from "@/lib/tunnel-store";
import {
  analyzeAnonymousPdfFn,
  generateAnonymousContentsFn,
} from "@/lib/onboarding.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/essai/analyse")({
  component: AnalysePage,
});

const MOCK_PRODUCTS: TunnelProduct[] = [
  { id: "1", product_name: "Pommes Gala 1kg", promo_price: 1.49, old_price: 2.49, discount_percent: 40, category: "Fruits et légumes" },
  { id: "2", product_name: "Filet de poulet 500g", promo_price: 4.99, old_price: 6.99, discount_percent: 29, category: "Boucherie" },
  { id: "3", product_name: "Yaourts nature x12", promo_price: 2.79, old_price: 3.99, discount_percent: 30, category: "Crèmerie" },
];

const MOCK_POSTS: TunnelPost[] = MOCK_PRODUCTS.map((p) => ({
  id: p.id,
  product_name: p.product_name,
  caption: `🛒 Bon plan ! ${p.product_name} à seulement ${p.promo_price}€ au lieu de ${p.old_price}€. Profitez-en cette semaine ! #promo #bonplan`,
}));

function AnalysePage() {
  const navigate = useNavigate();
  const { pdfBase64, pdfName, setDetectedProducts, setGeneratedPosts, setStep } =
    useTunnelStore();
  const analyze = useServerFn(analyzeAnonymousPdfFn);
  const generate = useServerFn(generateAnonymousContentsFn);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [progress, setProgress] = useState(0);
  const [counts, setCounts] = useState<{ products: number; promos: number }>({
    products: 0,
    promos: 0,
  });
  const ranRef = useRef(false);

  useEffect(() => {
    setStep("analyse");
  }, [setStep]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const start = Date.now();
    let products: TunnelProduct[] = MOCK_PRODUCTS;
    let posts: TunnelPost[] = MOCK_POSTS;

    // Run real AI in background if PDF available; fallback to mock
    const aiPromise = (async () => {
      if (!pdfBase64) return;
      try {
        const detected = await analyze({
          data: { file_name: pdfName || "catalogue.pdf", pdf_base64: pdfBase64 },
        });
        if (detected.length > 0) {
          products = detected.slice(0, 6).map((p, i) => ({
            id: String(i + 1),
            ...p,
          }));
          const top3 = products.slice(0, 3);
          const captions = await generate({
            data: { promotions: top3, banner: null },
          });
          posts = top3.map((p, i) => ({
            id: p.id,
            product_name: p.product_name,
            caption: captions[i]?.caption ?? MOCK_POSTS[i].caption,
          }));
        }
      } catch (e) {
        console.warn("AI fallback to mock:", e);
        toast.message("Mode démo : exemples affichés.");
      }
    })();

    // Phase timings
    const t1 = setTimeout(() => {
      setPhase(2);
      setTimeout(() => setCounts({ products: products.length, promos: products.length }), 200);
    }, 2000);
    const t2 = setTimeout(() => setPhase(3), 4000);

    // Progress bar 4-7s
    const progInterval = setInterval(() => {
      const elapsed = Date.now() - start - 4000;
      if (elapsed > 0) {
        setProgress(Math.min(100, (elapsed / 3000) * 100));
      }
    }, 80);

    // Finish: wait min 7s AND AI done
    const finish = async () => {
      const minWait = new Promise((r) => setTimeout(r, 7000 - (Date.now() - start)));
      await Promise.all([aiPromise, minWait]);
      setDetectedProducts(products);
      setGeneratedPosts(posts);
      setStep("preview");
      navigate({ to: "/essai/preview" });
    };
    void finish();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(progInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16">
      <Toaster />
      <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-full bg-brand-gradient-soft">
        {phase === 1 ? (
          <ScanLine className="h-12 w-12 animate-pulse text-foreground" />
        ) : phase === 2 ? (
          <Loader2 className="h-12 w-12 animate-spin text-foreground" />
        ) : (
          <Loader2 className="h-12 w-12 animate-spin text-foreground" />
        )}
      </div>

      {phase === 1 && (
        <p className="text-lg font-medium">Lecture du catalogue en cours…</p>
      )}

      {phase === 2 && (
        <div className="space-y-3 text-lg">
          <CheckLine delay={0} label={`${counts.products || "…"} produits identifiés`} />
          <CheckLine delay={400} label={`${counts.promos || "…"} promotions détectées`} />
          <CheckLine delay={800} label="Prix et réductions extraits" />
        </div>
      )}

      {phase === 3 && (
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-lg font-medium">Rédaction des publications…</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-brand-gradient transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CheckLine({ label, delay }: { label: string; delay: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={`flex items-center gap-3 transition-all duration-500 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <CheckCircle2 className="h-5 w-5 text-green-600" />
      <span>{label}</span>
    </div>
  );
}
