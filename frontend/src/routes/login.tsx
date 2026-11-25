import { createFileRoute } from "@tanstack/react-router";
import { Login } from "@/features/login";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { next?: string } =>
    typeof search["next"] === "string" ? { next: search["next"] } : {},
  head: () => metadata("Anmelden"),
  component: Page,
});
function Page() {
  return <Login {...Route.useSearch()} />;
}
