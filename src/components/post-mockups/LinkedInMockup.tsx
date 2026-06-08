import { ThumbsUp, MessageSquare, Repeat2, Send, MoreHorizontal, Globe2, RefreshCw, ImageIcon } from "lucide-react";
import { EditableText, initials } from "./shared";
import { PromoVisualMockup } from "./PromoVisualMockup";
import type { VisualMock } from "@/lib/tunnel-store";

type Props = {
  storeName: string;
  postText: string;
  imageUrl?: string;
  sector?: string;
  visualMock?: VisualMock | null;
  onTextChange: (t: string) => void;
  onRegenerateImage?: () => void;
  onChangeImage?: () => void;
};

export function LinkedInMockup({ storeName, postText, imageUrl, sector, visualMock, onTextChange, onRegenerateImage, onChangeImage }: Props) {
  return (
    <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-lg border border-[#38434F] bg-[#1B1F23] text-[#E7E9EA] shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-3">
        <div className="flex items-start gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0a66c2] text-sm font-semibold text-white">
            {initials(storeName)}
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold text-white">{storeName || "Mon magasin"}</div>
            <div className="text-[12px] text-[#A1A5A9]">{sector || "Commerce de détail"}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[#A1A5A9]">
              Il y a 2 min · <Globe2 className="h-3 w-3" />
            </div>
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5 text-[#A1A5A9]" />
      </div>

      {/* Body */}
      <div className="px-4 pb-3 pt-3 text-[14px] leading-[1.5]">
        <EditableText value={postText} onChange={onTextChange} />
      </div>

      {/* Image 1.91:1 */}
      <div className="relative w-full bg-[#0d0d0f]" style={{ aspectRatio: "1.91 / 1" }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <PromoVisualMockup
            visual={visualMock ? { ...visualMock, format: "1.91:1" } : {
              productName: storeName || "Offre du moment",
              promoPrice: null, oldPrice: null, discount: null, category: null,
              backgroundGradient: "linear-gradient(135deg, #ff66c4 0%, #ffde59 100%)",
              badgeText: "Offre catalogue", format: "1.91:1", variant: 0,
            }}
            storeName={storeName}
          />
        )}
        {onRegenerateImage && (
          <button
            onClick={onRegenerateImage}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur hover:bg-black/80"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Régénérer le visuel
          </button>
        )}
      </div>

      {/* Counters */}
      <div className="flex items-center justify-between px-4 py-2 text-[12px] text-[#A1A5A9]">
        <div className="flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0a66c2] text-[10px] text-white">
            👍
          </span>
          87 réactions
        </div>
        <div>12 commentaires · 4 reposts</div>
      </div>

      <div className="mx-4 border-t border-[#38434F]" />

      {/* Actions */}
      <div className="grid grid-cols-4 px-2 py-1">
        {[
          { icon: ThumbsUp, label: "J'aime" },
          { icon: MessageSquare, label: "Commenter" },
          { icon: Repeat2, label: "Republier" },
          { icon: Send, label: "Envoyer" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-semibold text-[#A1A5A9] hover:bg-[#2a2f34]"
          >
            <Icon className="h-5 w-5" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
