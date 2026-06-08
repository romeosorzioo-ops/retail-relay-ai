import { useEffect, useRef } from "react";

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

type EditableProps = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
};

export function EditableText({ value, onChange, className }: EditableProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onChange(e.currentTarget.innerText)}
      className={`outline-none focus:ring-2 focus:ring-primary/40 focus:bg-primary/5 rounded-sm whitespace-pre-wrap ${className ?? ""}`}
    />
  );
}
