import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Plus,
} from "lucide-react";
import {
  listScheduledPostsFn,
  updateScheduledPostFn,
} from "@/lib/scheduled-posts.functions";
import { toast } from "sonner";
import {
  CreatePostModal,
  type EditingPost,
} from "@/components/create-post-modal";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

type ScheduledPost = {
  id: string;
  caption: string;
  platforms: string[];
  post_type: string;
  scheduled_at: string;
  media_url: string | null;
  media_type: string | null;
  promotion_id: string | null;
  generated_content_id: string | null;
};

function CalendarPage() {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editing, setEditing] = useState<EditingPost>(null);

  const { data: posts = [] } = useQuery({
    queryKey: ["scheduled-posts"],
    queryFn: () => listScheduledPostsFn() as Promise<ScheduledPost[]>,
  });

  const move = useMutation({
    mutationFn: async (v: { post: ScheduledPost; newDate: string }) => {
      const orig = new Date(v.post.scheduled_at);
      const next = new Date(v.newDate);
      next.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
      return updateScheduledPostFn({
        data: {
          id: v.post.id,
          platforms: v.post.platforms as ("facebook" | "instagram")[],
          post_type: v.post.post_type as "post" | "story" | "reel",
          caption: v.post.caption,
          media_url: v.post.media_url,
          media_type: v.post.media_type,
          scheduled_at: next.toISOString(),
          promotion_id: v.post.promotion_id,
          generated_content_id: v.post.generated_content_id,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-posts"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const monthStart = startOfMonth(cursor);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });

  function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const id = String(e.active.id);
    const date = String(e.over.id);
    const p = posts.find((x) => x.id === id);
    if (p && format(new Date(p.scheduled_at), "yyyy-MM-dd") !== date) {
      move.mutate({ post: p, newDate: date });
    }
  }

  function openCreate(d: Date) {
    setEditing(null);
    setSelectedDate(d);
    setModalOpen(true);
  }
  function openEdit(p: ScheduledPost) {
    setEditing(p);
    setSelectedDate(new Date(p.scheduled_at));
    setModalOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendrier</h1>
          <p className="text-sm text-muted-foreground">
            Cliquez sur un jour pour programmer une publication.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor(subMonths(cursor, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[10rem] text-center text-sm font-medium capitalize">
            {format(cursor, "MMMM yyyy", { locale: fr })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor(addMonths(cursor, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => openCreate(new Date())}>
            <Plus className="h-4 w-4" /> Nouvelle publication
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <DndContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-7 gap-px rounded-md bg-border text-xs">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div
                  key={d}
                  className="bg-background py-2 text-center font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const items = posts.filter(
                  (p) => format(new Date(p.scheduled_at), "yyyy-MM-dd") === key,
                );
                return (
                  <DayCell
                    key={key}
                    date={day}
                    dateKey={key}
                    inMonth={isSameMonth(day, cursor)}
                    today={isSameDay(day, new Date())}
                    onClickEmpty={() => openCreate(day)}
                  >
                    {items.map((p) => (
                      <DraggablePost
                        key={p.id}
                        post={p}
                        onClick={() => openEdit(p)}
                      />
                    ))}
                  </DayCell>
                );
              })}
            </div>
          </DndContext>
        </CardContent>
      </Card>

      <CreatePostModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialDate={selectedDate}
        editing={editing}
      />
    </div>
  );
}

function DayCell({
  dateKey,
  date,
  inMonth,
  today,
  children,
  onClickEmpty,
}: {
  dateKey: string;
  date: Date;
  inMonth: boolean;
  today: boolean;
  children: React.ReactNode;
  onClickEmpty: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.empty === "1") {
          onClickEmpty();
        }
      }}
      className={`group min-h-[110px] cursor-pointer bg-background p-1.5 transition hover:bg-accent/30 ${
        !inMonth ? "opacity-40" : ""
      } ${isOver ? "ring-2 ring-primary ring-inset" : ""}`}
    >
      <div
        data-empty="1"
        className="mb-1 flex items-center justify-between"
      >
        <span
          data-empty="1"
          className={`text-xs ${
            today
              ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
              : "text-muted-foreground"
          }`}
        >
          {format(date, "d")}
        </span>
        <Plus
          data-empty="1"
          className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100"
        />
      </div>
      <div data-empty="1" className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function DraggablePost({
  post,
  onClick,
}: {
  post: ScheduledPost;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: post.id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;
  const time = format(new Date(post.scheduled_at), "HH:mm");
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-md border bg-card px-1.5 py-1 text-[11px] leading-tight shadow-sm hover:border-primary ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-medium">{time}</span>
        <div className="flex items-center gap-0.5">
          {post.platforms.includes("facebook") && (
            <Facebook className="h-3 w-3 text-[#1877F2]" />
          )}
          {post.platforms.includes("instagram") && (
            <Instagram className="h-3 w-3 text-[#E4405F]" />
          )}
        </div>
      </div>
      <p className="line-clamp-2 text-muted-foreground">
        {post.caption || post.post_type}
      </p>
    </div>
  );
}
