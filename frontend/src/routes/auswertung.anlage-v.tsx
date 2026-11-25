import { createFileRoute } from "@tanstack/react-router";
import { Analysis } from "@/features/analysis";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/auswertung/anlage-v")({
  head: () => metadata("Auswertung Anlage V"),
  component: Page,
});
function Page() {
  return <Analysis tax />;
}
