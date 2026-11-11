import { createFileRoute } from "@tanstack/react-router";
import ChatApp from "../components/ChatApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mirante · Assistente financeiro (demonstração)" },
      {
        name: "description",
        content: "Assistente financeiro em português com dados fictícios da Plaid Sandbox. Demonstração educacional.",
      },
    ],
  }),
  component: ChatApp,
});
