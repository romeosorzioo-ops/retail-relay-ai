import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type VisualStatus =
  | "pending"
  | "source_extracted"
  | "cutout_done"
  | "template_generated"
  | "fallback";

export type TunnelProduct = {
  id: string;
  product_name: string;
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
};

export type TunnelStep = "import" | "analyse" | "preview" | "schedule";

type TunnelState = {
  // pdfFile is intentionally NOT persisted (File can't be serialized)
  pdfFile: File | null;
  pdfName: string;
  pdfBase64: string;
  detectedProducts: TunnelProduct[];
  generatedPosts: TunnelPost[];
  currentStep: TunnelStep;
  setPdf: (file: File | null, base64?: string) => void;
  setDetectedProducts: (p: TunnelProduct[]) => void;
  setGeneratedPosts: (p: TunnelPost[]) => void;
  addPost: (p: TunnelPost) => void;
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
      setStep: (currentStep) => set({ currentStep }),
      reset: () =>
        set({
          pdfFile: null,
          pdfName: "",
          pdfBase64: "",
          detectedProducts: [],
          generatedPosts: [],
          currentStep: "import",
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
      }),
    },
  ),
);
