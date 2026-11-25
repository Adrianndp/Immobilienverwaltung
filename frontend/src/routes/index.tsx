import { createFileRoute, redirect } from "@tanstack/react-router";
import { metadata } from "@/components/shared";
export const Route = createFileRoute("/")({
  head: () => metadata("Immobilienportfolio"),
  beforeLoad: () => {
    throw redirect({ to: "/mietobjekte" });
  },
});
