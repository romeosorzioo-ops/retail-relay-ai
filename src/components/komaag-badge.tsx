import { cn } from "@/lib/utils";

interface KomaagBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function KomaagBadge({ children, className }: KomaagBadgeProps) {
  return (
    <span className={cn("komaag-badge", className)}>
      {children}
    </span>
  );
}
