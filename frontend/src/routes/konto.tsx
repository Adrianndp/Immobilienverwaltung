import { createFileRoute } from "@tanstack/react-router";
import { Account } from "@/features/account";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/konto")({
  head: () => metadata("Konto"),
  component: Page,
});
function Page() {
  return <Account />;
}
