import { createFileRoute } from "@tanstack/react-router";
import { Categories } from "@/features/costs";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/kosten/kostenarten")({
  head: () => metadata("Kostenarten"),
  component: Page,
});
function Page() {
  return <Categories />;
}
