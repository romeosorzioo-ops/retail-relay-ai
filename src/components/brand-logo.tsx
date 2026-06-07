import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: number;
  withShadow?: boolean;
}

/**
 * Komaag brand mark — rounded tile with the official pink→yellow gradient
 * and a centered white "K". Single source of truth for the logo across
 * the app (sidebar, auth screen, favicon-like avatars, etc.).
 */
export function BrandLogo({ className, size = 32, withShadow = false }: BrandLogoProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-brand-gradient font-extrabold text-white",
        withShadow && "shadow-brand",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.58),
        lineHeight: 1,
      }}
      aria-label="Komaag"
    >
      K
    </div>
  );
}
