import { createFileRoute } from "@tanstack/react-router";
import { Tenants } from "@/features/tenants";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/mieter")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { status?: "laufend" | "zukuenftig" | "archiv" } => ({
    status:
      search["status"] === "zukuenftig"
        ? "zukuenftig"
        : search["status"] === "archiv"
          ? "archiv"
          : "laufend",
  }),
  head: () => metadata("Meine Mieter"),
  component: Page,
});
function Page() {
  return <Tenants status={Route.useSearch().status ?? "laufend"} />;
}
