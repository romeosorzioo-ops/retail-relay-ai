import * as React from "react";
import { CalendarIcon, Clock, Check } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = {
  date: string | null | undefined; // yyyy-mm-dd
  time: string | null | undefined; // HH:mm
  onChange: (next: { date: string; time: string }) => void;
  className?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function parseIso(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function formatLong(date: string | null | undefined, time: string | null | undefined) {
  const d = parseIso(date);
  if (!d) return "Programmer";
  const label = d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${label}${time ? ` · ${time}` : ""}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

export function SchedulePicker({ date, time, onChange, className }: Props) {
  const [open, setOpen] = React.useState(false);
  const [draftDate, setDraftDate] = React.useState<Date | undefined>(parseIso(date));
  const [hour, minute] = (time ?? "10:00").split(":");
  const [draftHour, setDraftHour] = React.useState(hour ?? "10");
  const [draftMinute, setDraftMinute] = React.useState(minute ?? "00");

  React.useEffect(() => {
    if (open) {
      setDraftDate(parseIso(date) ?? new Date());
      const [h, m] = (time ?? "10:00").split(":");
      setDraftHour(h ?? "10");
      setDraftMinute(m ?? "00");
    }
  }, [open, date, time]);

  const confirm = () => {
    if (!draftDate) return;
    onChange({ date: toIso(draftDate), time: `${draftHour}:${draftMinute}` });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex w-full items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-muted",
            className,
          )}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <span className="flex-1 truncate text-left">
            {formatLong(date, time)}
          </span>
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        sideOffset={6}
      >
        <div className="flex flex-col sm:flex-row">
          <Calendar
            mode="single"
            selected={draftDate}
            onSelect={(d) => d && setDraftDate(d)}
            initialFocus
            className={cn("pointer-events-auto p-3")}
          />
          <div className="flex border-t border-border sm:border-l sm:border-t-0">
            <TimeColumn
              label="Heures"
              items={HOURS}
              value={draftHour}
              onPick={setDraftHour}
            />
            <TimeColumn
              label="Minutes"
              items={MINUTES}
              value={draftMinute}
              onPick={setDraftMinute}
            />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>
            {draftDate ? draftDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "—"}
            {" · "}
            <span className="font-medium text-foreground">
              {draftHour}:{draftMinute}
            </span>
          </span>
          <Button size="sm" variant="brand" onClick={confirm}>
            <Check className="h-3.5 w-3.5" /> Valider
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeColumn({
  label,
  items,
  value,
  onPick,
}: {
  label: string;
  items: string[];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex w-20 flex-col">
      <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <ScrollArea className="h-[260px]">
        <div className="flex flex-col gap-0.5 p-1">
          {items.map((it) => (
            <button
              key={it}
              type="button"
              onClick={() => onPick(it)}
              className={cn(
                "rounded-md px-3 py-1.5 text-center text-sm transition",
                value === it
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {it}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
