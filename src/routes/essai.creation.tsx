import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CreationEditor } from "@/components/creation/CreationEditor";

export const Route = createFileRoute("/essai/creation")({
  component: EssaiCreation,
});

function EssaiCreation() {
  const navigate = useNavigate();
  return (
    <CreationEditor
      mode="trial"
      onBack={() => navigate({ to: "/essai/selection" })}
      onContinue={() => navigate({ to: "/essai/publication" })}
    />
  );
}
