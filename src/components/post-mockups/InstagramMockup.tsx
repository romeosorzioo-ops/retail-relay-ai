import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, RefreshCw, ImageIcon } from "lucide-react";
import { EditableText, initials } from "./shared";
import { PromoVisualMockup } from "./PromoVisualMockup";
import type { VisualMock } from "@/lib/tunnel-store";

type Props = {
  storeName: string;
  postText: string;
  imageUrl?: string;
  visualMock?: VisualMock | null;
  onTextChange: (t: string) => void;
  onRegenerateImage?: () => void;
  onChangeImage?: () => void;
};

function renderWithHashtags(text: string) {
  const parts = text.split(/(#[\p{L}0-9_]+)/gu);
  return parts.map((p, i) =>
    p.startsWith("#") ? (
      <span key={i} className="text-[#E0F1FF] font-medium">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function InstagramMockup({ storeName, postText, imageUrl, visualMock, onTextChange, onRegenerateImage, onChangeImage }: Props) {
  const [hover, setHover] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[470px] overflow-hidden rounded-lg border border-[#262626] bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-gradient-to-tr from-[#feda75] via-[#fa7e1e] to-[#d62976] p-[2px]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-semibold">
              {initials(storeName)}
            </div>
          </div>
          <div className="text-[14px] font-semibold">{storeName || "mon_magasin"}</div>
        </div>
        <MoreHorizontal className="h-5 w-5" />
      </div>

      {/* Square image */}
      <div
        className="relative aspect-square w-full bg-[#111]"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <PromoVisualMockup
            visual={visualMock ? { ...visualMock, format: "1:1" } : {
              productName: storeName || "Offre du moment",
              promoPrice: null, oldPrice: null, discount: null, category: null,
              backgroundGradient: "linear-gradient(135deg, #ff66c4 0%, #ffde59 100%)",
              badgeText: "Offre catalogue", format: "1:1", variant: 0,
            }}
            storeName={storeName}
          />
        )}
        {hover && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-sm font-medium text-white backdrop-blur-sm">
            {onChangeImage && (
              <button onClick={onChangeImage} className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-2 hover:bg-white/25">
                <ImageIcon className="h-4 w-4" /> Changer l'image
              </button>
            )}
            {onRegenerateImage && !imageUrl && (
              <button onClick={onRegenerateImage} className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-2 hover:bg-white/25">
                <RefreshCw className="h-4 w-4" /> Régénérer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3">
          <Heart className="h-6 w-6" />
          <MessageCircle className="h-6 w-6" />
          <Send className="h-6 w-6" />
        </div>
        <Bookmark className="h-6 w-6" />
      </div>

      <div className="px-3 pb-1 text-[14px] font-semibold">128 J'aime</div>

      {/* Caption */}
      <div className="px-3 pb-3 text-[14px] leading-[1.4]">
        <div className="mb-1 font-semibold">{storeName || "mon_magasin"}</div>
        <EditableText value={postText} onChange={onTextChange} />
        <div className="mt-1 whitespace-pre-wrap text-[#A1A5A9]">
          {renderWithHashtags(postText)}
        </div>
      </div>
    </div>
  );
}
