import { createFileRoute } from "@tanstack/react-router";
import { Properties } from "@/features/properties";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/mietobjekte")({
  head: () => metadata("Meine Mietobjekte"),
  component: Page,
});
function Page() {
  return <Properties />;
}
