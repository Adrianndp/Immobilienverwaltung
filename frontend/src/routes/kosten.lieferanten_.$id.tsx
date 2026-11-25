import { createFileRoute } from "@tanstack/react-router";
import { VendorDetail } from "@/features/costs";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/kosten/lieferanten_/$id")({
  head: () => metadata("Lieferant Details"),
  component: Page,
});
function Page() {
  return <VendorDetail id={Number(Route.useParams().id)} />;
}
