import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TemplateKey } from "./promo-templates";


export type VisualStatus =
  | "pending"
  | "source_extracted"
  | "cutout_done"
  | "template_generated"
  | "fallback";

export type TunnelProduct = {
  id: string;
  product_name: string;
  productLabel?: string | null;
  promo_price?: number | null;
  old_price?: number | null;
  discount_percent?: number | null;
  category?: string | null;
  pageNumber?: number | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  cropCoordinates?: { x: number; y: number; width: number; height: number } | null;
  sourceImageUrl?: string | null;
  cutoutImageUrl?: string | null;
  finalVisualUrl?: string | null;
  visualStatus?: VisualStatus;
  confidence?: number | null;
  missingFields?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  templateCategory?: TemplateKey | null;
  productType?: "packaged" | "fresh" | null;
  selected?: boolean;
};

export type TunnelPlatform = "facebook" | "instagram" | "linkedin";

export type VisualFormat = "16:9" | "1:1" | "1.91:1";

export type VisualMock = {
  productName: string;
  promoPrice?: number | null;
  oldPrice?: number | null;
  discount?: number | null;
  category?: string | null;
  backgroundGradient: string;
  badgeText: string;
  format: VisualFormat;
  variant?: number;
};

export type TunnelPost = {
  id: string;
  product_name: string;
  caption: string;
  platform?: TunnelPlatform;
  imageUrl?: string | null;
  productImageUrl?: string | null;
  pageNumber?: number | null;
  visualMock?: VisualMock | null;
  selected?: boolean;
  scheduled_at?: string | null;
  sourceImageUrl?: string | null;
  cutoutImageUrl?: string | null;
  finalVisualUrl?: string | null;
  visualTemplate?: string | null;
  visualStatus?: VisualStatus;
  format?: import("./post-formats").PostFormatKey | null;
  platforms?: { facebook: boolean; instagram: boolean };
  scheduledDate?: string | null;
  scheduledTime?: string | null;
};

export type TunnelStep =
  | "import"
  | "analyse"
  | "selection"
  | "creation"
  | "publication";

export type CreativeState = {
  promoId: string;
  bgImage?: string | null;
  bgColor?: string | null;
  visualMode?: "cutout" | "fullbleed";
  cutoutImageUrl?: string | null;
  generatedImageUrl?: string | null;
  catalogColor?: string | null;
  templateCategory?: TemplateKey | null;
  blocks?: unknown;
  elements?: unknown;
  isValidated?: boolean;
  updatedAt?: number;
};

type TunnelState = {
  // pdfFile is intentionally NOT persisted (File can't be serialized)
  pdfFile: File | null;
  pdfName: string;
  pdfBase64: string;
  detectedProducts: TunnelProduct[];
  generatedPosts: TunnelPost[];
  currentStep: TunnelStep;
  creativeStateByPromoId: Record<string, CreativeState>;
  setCreativeState: (promoId: string, patch: Partial<CreativeState>) => void;
  setPdf: (file: File | null, base64?: string) => void;
  setDetectedProducts: (p: TunnelProduct[]) => void;
  setGeneratedPosts: (p: TunnelPost[]) => void;
  addPost: (p: TunnelPost) => void;
  updatePost: (id: string, patch: Partial<TunnelPost>) => void;
  setStep: (s: TunnelStep) => void;
  reset: () => void;
};

export const useTunnelStore = create<TunnelState>()(
  persist(
    (set) => ({
      pdfFile: null,
      pdfName: "",
      pdfBase64: "",
      detectedProducts: [],
      generatedPosts: [],
      currentStep: "import",
      creativeStateByPromoId: {},
      setCreativeState: (promoId, patch) =>
        set((s) => ({
          creativeStateByPromoId: {
            ...s.creativeStateByPromoId,
            [promoId]: {
              ...(s.creativeStateByPromoId[promoId] ?? { promoId }),
              ...patch,
              promoId,
              updatedAt: Date.now(),
            },
          },
        })),
      setPdf: (file, base64) =>
        set({
          pdfFile: file,
          pdfName: file?.name ?? "",
          pdfBase64: base64 ?? "",
        }),
      setDetectedProducts: (detectedProducts) => set({ detectedProducts }),
      setGeneratedPosts: (generatedPosts) =>
        set({ generatedPosts: generatedPosts.slice(0, 3) }),
      addPost: (p) =>
        set((s) => ({
          generatedPosts: [...s.generatedPosts, p].slice(0, 3),
        })),
      updatePost: (id, patch) =>
        set((s) => ({
          generatedPosts: s.generatedPosts.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),
      setStep: (currentStep) => set({ currentStep }),
      reset: () =>
        set({
          pdfFile: null,
          pdfName: "",
          pdfBase64: "",
          detectedProducts: [],
          generatedPosts: [],
          currentStep: "import",
          creativeStateByPromoId: {},
        }),
    }),
    {
      name: "komaag-tunnel-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        pdfName: s.pdfName,
        detectedProducts: s.detectedProducts,
        generatedPosts: s.generatedPosts,
        currentStep: s.currentStep,
        creativeStateByPromoId: s.creativeStateByPromoId,
      }),
    },
  ),
);
