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
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import {
  deleteCalendarPostFn,
  listCalendarFn,
  moveCalendarPostFn,
} from "@/lib/calendar.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

const CHANNEL_LABEL: Record<string, string> = {
  facebook_post: "FB",
  instagram_post: "IG",
  instagram_story: "Story",
  reel_idea: "Reel",
};

function CalendarPage() {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(new Date());
  const { data: posts = [] } = useQuery({
    queryKey: ["calendar"],
    queryFn: () => listCalendarFn(),
  });

  const move = useMutation({
    mutationFn: (v: { id: string; scheduled_date: string }) =>
      moveCalendarPostFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteCalendarPostFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
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
    const p = posts.find((x: any) => x.id === id);
    if (p && p.scheduled_date !== date) {
      move.mutate({ id, scheduled_date: date });
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendrier</h1>
          <p className="text-sm text-muted-foreground">
            Glissez-déposez vos contenus.
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
                  (p: any) => p.scheduled_date === key,
                );
                return (
                  <DayCell
                    key={key}
                    date={day}
                    dateKey={key}
                    inMonth={isSameMonth(day, cursor)}
                    today={isSameDay(day, new Date())}
                  >
                    {items.map((p: any) => (
                      <DraggablePost
                        key={p.id}
                        post={p}
                        onDelete={() => del.mutate(p.id)}
                      />
                    ))}
                  </DayCell>
                );
              })}
            </div>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}

function DayCell({
  dateKey,
  date,
  inMonth,
  today,
  children,
}: {
  dateKey: string;
  date: Date;
  inMonth: boolean;
  today: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[110px] bg-background p-1.5 ${
        !inMonth ? "opacity-40" : ""
      } ${isOver ? "ring-2 ring-primary ring-inset" : ""}`}
    >
      <div
        className={`mb-1 text-xs ${
          today
            ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
            : "text-muted-foreground"
        }`}
      >
        {format(date, "d")}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DraggablePost({
  post,
  onDelete,
}: {
  post: any;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: post.id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;
  const text =
    post.channel === "facebook_post"
      ? post.facebook_post
      : post.channel === "instagram_post"
        ? post.instagram_post
        : post.channel === "instagram_story"
          ? post.instagram_story
          : post.reel_idea;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group rounded-md border bg-accent/40 px-1.5 py-1 text-[11px] leading-tight ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-accent-foreground">
          {CHANNEL_LABEL[post.channel] ?? post.channel}
        </span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="opacity-0 transition group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
      <p className="line-clamp-2 text-muted-foreground">
        {post.promo_name ?? text?.slice(0, 40)}
      </p>
    </div>
  );
}
