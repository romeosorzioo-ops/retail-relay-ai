import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createScheduledPostFn, FREE_LIMIT_ERROR } from "@/lib/scheduled-posts.functions";
import { updateCampaignItemFn } from "@/lib/campaigns.functions";
import { POST_FORMAT_LIST, getPostFormat, DEFAULT_POST_FORMAT } from "@/lib/post-formats";
import { PremiumLimitModal } from "@/components/premium-limit-modal";

export type CampaignItemForSchedule = {
  id: string;
  recommended_platform: string | null;
  recommended_date: string | null;
  recommended_time: string | null;
  recommended_format: string | null;
  generated_caption: string | null;
  final_visual_url: string | null;
  promo_price: number | null;
};

export function ScheduleItemModal({
  open, onOpenChange, item, onScheduled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: CampaignItemForSchedule | null;
  onScheduled?: () => void;
}) {
  const qc = useQueryClient();
  const [platform, setPlatform] = useState("facebook");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [caption, setCaption] = useState("");
  const [formatKey, setFormatKey] = useState<string>(DEFAULT_POST_FORMAT);
  const [showPremium, setShowPremium] = useState(false);

  useEffect(() => {
    if (!item) return;
    setPlatform(item.recommended_platform ?? "facebook");
    setDate(item.recommended_date ?? new Date().toISOString().slice(0, 10));
    setTime(item.recommended_time ?? "10:00");
    setCaption(item.generated_caption ?? "");
    setFormatKey(getPostFormat(item.recommended_format).key);
  }, [item]);

  const schedule = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("Aucun élément");
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      const post = await createScheduledPostFn({
        data: {
          platforms: [platform as "facebook" | "instagram"],
          post_type: "post",
          caption,
          media_url: item.final_visual_url,
          media_type: item.final_visual_url ? "image/png" : null,
          scheduled_at,
          status: "scheduled",
          format: formatKey,
        },
      });
      await updateCampaignItemFn({
        data: {
          id: item.id,
          status: "scheduled",
          scheduled_post_id: post.id,
          recommended_platform: platform,
          recommended_date: date,
          recommended_time: time,
          recommended_format: formatKey,
          generated_caption: caption,
        },
      });
      return post;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-items"] });
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
      toast.success("Post programmé");
      onOpenChange(false);
      onScheduled?.();
    },
    onError: (e: Error) => {
      if (e.message?.includes(FREE_LIMIT_ERROR)) {
        onOpenChange(false);
        setShowPremium(true);
        return;
      }
      toast.error(e.message);
    },

  const fmt = getPostFormat(formatKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" /> Programmer le visuel
          </DialogTitle>
        </DialogHeader>
        {item?.final_visual_url && (
          <img src={item.final_visual_url} alt="" className="mx-auto max-h-48 rounded border object-contain" />
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs mb-1 block">Format</Label>
            <Select value={formatKey} onValueChange={setFormatKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POST_FORMAT_LIST.map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">{fmt.w}×{fmt.h} px</p>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Réseau</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Heure</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs mb-1 block">Texte du post</Label>
          <Textarea rows={5} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={schedule.isPending}>
            Annuler
          </Button>
          <Button variant="brand" onClick={() => schedule.mutate()} disabled={schedule.isPending || !date}>
            {schedule.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Programmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
