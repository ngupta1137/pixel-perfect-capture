import { createFileRoute } from "@tanstack/react-router";
import { RequireView } from "@/components/shell/Denied";
import { AdvocateAsk } from "@/components/ask/AdvocateAsk";
import { MemberChat } from "@/components/ask/MemberChat";
import { isMemberAudience, routeCaps } from "@/lib/rights";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ask — Verity" },
      {
        name: "description",
        content: "Ask Verity for approved answers in advocate view, member chat, or voice.",
      },
      { property: "og:title", content: "Ask — Verity" },
      { property: "og:description", content: "One approved truth, in every channel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AskPage,
});

export function AskPage() {
  const { person } = useSession();
  return (
    <RequireView caps={routeCaps("/")}>
      {isMemberAudience(person) ? <MemberChat /> : <AdvocateAsk />}
    </RequireView>
  );
}
