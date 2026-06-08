import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/essai/")({
  beforeLoad: () => {
    throw redirect({ to: "/essai/import" });
  },
});
