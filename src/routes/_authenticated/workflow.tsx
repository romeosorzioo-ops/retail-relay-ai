import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import {
  WorkflowProgress,
  type WorkflowStep,
} from "@/components/workflow/WorkflowProgress";

export const Route = createFileRoute("/_authenticated/workflow")({
  component: WorkflowLayout,
});

function WorkflowLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const seg = path.split("/")[2] || "import";
  const valid: WorkflowStep[] = [
    "import",
    "analyse",
    "selection",
    "creation",
    "publication",
  ];
  const active = (valid as string[]).includes(seg)
    ? (seg as WorkflowStep)
    : "import";
  return (
    <div className="flex min-h-full flex-col">
      <WorkflowProgress active={active} mode="app" />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
