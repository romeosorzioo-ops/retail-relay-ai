import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, Globe2, RefreshCw, ImageIcon } from "lucide-react";
import { EditableText, initials } from "./shared";
import { PromoVisualMockup } from "./PromoVisualMockup";
import { KomaagTemplateVisual, type KomaagTemplateVisualProps } from "./KomaagTemplateVisual";
import type { VisualMock } from "@/lib/tunnel-store";
import { getPostFormat, type PostFormatKey } from "@/lib/post-formats";

type Props = {
  storeName: string;
  postText: string;
  imageUrl?: string;
  visualMock?: VisualMock | null;
  templateData?: KomaagTemplateVisualProps | null;
  onTextChange: (t: string) => void;
  onRegenerateImage?: () => void;
  onChangeImage?: () => void;
  format?: PostFormatKey | null;
};

export function FacebookMockup({ storeName, postText, imageUrl, visualMock, templateData, onTextChange, onRegenerateImage, onChangeImage, format }: Props) {
  const aspect = format ? getPostFormat(format).aspect : undefined;
  return (
    <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-lg border border-[#3A3B3C] bg-[#1C1E21] text-[#E4E6EB] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1877F2] to-[#0a5cc0] text-sm font-semibold text-white">
            {initials(storeName)}
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-white">{storeName || "Mon magasin"}</div>
            <div className="flex items-center gap-1 text-[12px] text-[#B0B3B8]">
              Il y a 2 minutes · <Globe2 className="h-3 w-3" />
            </div>
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5 text-[#B0B3B8]" />
      </div>

      {/* Body */}
      <div className="px-4 pb-3 pt-2 text-[15px] leading-[1.4]">
        <EditableText value={postText} onChange={onTextChange} />
      </div>

      {/* Image 16:9 */}
      <div className="relative aspect-video w-full bg-[#0d0d0f]">
        {templateData ? (
          <KomaagTemplateVisual {...templateData} format="16:9" />
        ) : imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <PromoVisualMockup
            visual={visualMock ? { ...visualMock, format: "16:9" } : {
              productName: storeName || "Offre du moment",
              promoPrice: null, oldPrice: null, discount: null, category: null,
              backgroundGradient: "linear-gradient(135deg, #ff66c4 0%, #ffde59 100%)",
              badgeText: "Offre catalogue", format: "16:9", variant: 0,
            }}
            storeName={storeName}
          />
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {onChangeImage && (
            <button
              onClick={onChangeImage}
              className="inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur hover:bg-black/80"
            >
              <ImageIcon className="h-3.5 w-3.5" /> Changer l'image
            </button>
          )}
          {onRegenerateImage && !templateData && !imageUrl && (
            <button
              onClick={onRegenerateImage}
              className="inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur hover:bg-black/80"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Régénérer
            </button>
          )}
        </div>
      </div>

      {/* Counters */}
      <div className="flex items-center justify-between px-4 py-2 text-[13px] text-[#B0B3B8]">
        <div className="flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1877F2] text-[10px] text-white">
            👍
          </span>
          42
        </div>
        <div>3 commentaires · 1 partage</div>
      </div>

      <div className="mx-4 border-t border-[#3A3B3C]" />

      {/* Actions */}
      <div className="grid grid-cols-3 px-2 py-1">
        {[
          { icon: ThumbsUp, label: "J'aime" },
          { icon: MessageCircle, label: "Commenter" },
          { icon: Share2, label: "Partager" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex items-center justify-center gap-2 rounded-md py-2 text-[14px] font-semibold text-[#B0B3B8] hover:bg-[#2a2a30]"
          >
            <Icon className="h-5 w-5" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
