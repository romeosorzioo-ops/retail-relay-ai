import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CreationEditor, type CreationEditorSearch } from "@/components/creation/CreationEditor";

export const Route = createFileRoute("/_authenticated/creation")({
  validateSearch: (s: Record<string, unknown>): CreationEditorSearch => ({
    cp: typeof s.cp === "string" ? s.cp : undefined,
    mode:
      s.mode === "catalog_visual" || s.mode === "field_photo"
        ? (s.mode as "catalog_visual" | "field_photo")
        : undefined,
    campaign: typeof s.campaign === "string" ? s.campaign : undefined,
    tab: s.tab === "queue" || s.tab === "editor" ? (s.tab as "queue" | "editor") : undefined,
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: CreationRoutePage,
});

function CreationRoutePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  return (
    <CreationEditor
      mode="app"
      search={search}
      onSearchChange={(next) =>
        navigate({ to: "/creation", search: next as never, replace: true })
      }
    />
  );
}
