import { createFileRoute } from "@tanstack/react-router";
import { Invoices } from "@/features/costs";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/kosten/rechnungen")({
  head: () => metadata("Rechnungen"),
  component: Page,
});
function Page() {
  return <Invoices />;
}
