import { createFileRoute } from "@tanstack/react-router";
import { Analysis } from "@/features/analysis";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/auswertung/deckungsbeitrag")({
  head: () => metadata("Objekt Deckungsbeitrag"),
  component: Page,
});
function Page() {
  return <Analysis />;
}
