import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerityLogo } from "@/components/VerityLogo";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/sign-in")({
  head: () =>
    pageHead(
      "Workspace entry",
      "Enter the Verity synthetic demonstration workspace. Enterprise authentication is not connected.",
    ),
  component: SignInPage,
});
function SignInPage() {
  return (
    <section className="mx-auto flex min-h-[640px] max-w-5xl items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <VerityLogo className="mb-8 h-10 w-10" />
        <h1 className="text-3xl font-semibold">Welcome to Verity</h1>
        <p className="mt-3 leading-7 text-ink-muted">Enter the demonstration workspace.</p>
        <div className="mt-8 border-y border-border py-6">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <LockKeyhole className="h-4 w-4 text-primary" />
            Enterprise sign-in is not connected
          </p>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            This prototype uses synthetic people and in-memory data. No password is needed, and
            selecting a demo person is not authentication.
          </p>
        </div>
        <Button className="mt-8 w-full" size="lg" asChild>
          <Link to="/onboarding">
            Continue to demo <ArrowRight />
          </Link>
        </Button>
        <Button className="mt-3 w-full" variant="ghost" asChild>
          <Link to="/welcome">Back to Verity</Link>
        </Button>
      </div>
    </section>
  );
}
