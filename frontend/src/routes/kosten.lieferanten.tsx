import { createFileRoute } from "@tanstack/react-router";
import { Vendors } from "@/features/costs";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/kosten/lieferanten")({
  head: () => metadata("Lieferanten"),
  component: Page,
});
function Page() {
  return <Vendors />;
}
