import { createFileRoute } from "@tanstack/react-router";
import { PropertyDetail } from "@/features/properties";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/mietobjekte_/$id")({
  head: () => metadata("Mietobjekt Details"),
  component: Page,
});
function Page() {
  return <PropertyDetail id={Number(Route.useParams().id)} />;
}
