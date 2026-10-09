import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, Info, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerityLogo } from "@/components/VerityLogo";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/sign-in")({
  head: () =>
    pageHead(
      "Sign in",
      "Sign in to the Verity demonstration workspace. Enterprise authentication is not connected in this prototype.",
    ),
  component: SignInPage,
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const provider = (name: string) =>
    setNotice(`${name} sign-in is not connected in this prototype. Use the demo entry below.`);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!email.trim()) return setError("Enter your work email.");
    if (!EMAIL.test(email.trim())) return setError("Enter a valid email address, like name@company.com.");
    setError(null);
    // Demo only: no credential is checked or stored. Real auth plugs in here later.
    void navigate({ to: "/onboarding" });
  };

  return (
    <section className="grid min-h-[calc(100vh-150px)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <VerityLogo className="mb-6 h-10 w-10" />
          <h1 className="text-3xl font-semibold">Sign in to Verity</h1>
          <p className="mt-2 text-sm text-ink-muted">Governed knowledge for your workspace.</p>

          <div className="mt-8 space-y-3">
            <Button variant="outline" className="w-full" size="lg" onClick={() => provider("Google")}>
              <span className="font-bold text-primary">G</span> Continue with Google
            </Button>
            <Button variant="outline" className="w-full" size="lg" onClick={() => provider("Microsoft")}>
              <span className="grid grid-cols-2 gap-px" aria-hidden>
                <span className="h-1.5 w-1.5 bg-primary" />
                <span className="h-1.5 w-1.5 bg-ink-muted" />
                <span className="h-1.5 w-1.5 bg-ink-muted" />
                <span className="h-1.5 w-1.5 bg-primary" />
              </span>
              Continue with Microsoft
            </Button>
          </div>
          {notice && (
            <p role="status" className="mt-3 flex gap-2 rounded-md bg-muted p-3 text-xs text-ink-muted">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              {notice}
            </p>
          )}

          <div className="my-6 flex items-center gap-3 text-xs text-ink-muted">
            <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} noValidate className="space-y-3">
            <Label htmlFor="email">Work email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                className="pl-9"
                value={email}
                aria-invalid={!!error}
                aria-describedby={error ? "email-error" : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
            {error && (
              <p id="email-error" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg">
              Continue to demo <ArrowRight />
            </Button>
          </form>

          <p className="mt-6 flex gap-2 text-xs leading-5 text-ink-muted">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Prototype: no password is checked and nothing is stored. Choosing a demo role is not
            authentication; permissions still come from the selected person.
          </p>
          <Link to="/welcome" className="mt-4 inline-block text-xs text-primary hover:underline">
            ← Back to Verity
          </Link>
        </div>
      </div>
      <div className="hidden flex-col justify-center gap-6 border-l border-border bg-surface-alt px-14 lg:flex">
        <p className="text-xs font-semibold text-primary">WHY TEAMS TRUST VERITY</p>
        {[
          ["Approved, not improvised", "Every answer cites the approved unit, version and approver."],
          ["Scoped by responsibility", "People only see knowledge their role is entitled to."],
          ["Humans decide", "Agents read and propose. Named people approve."],
        ].map(([t, d]) => (
          <div key={t} className="border-l-2 border-primary pl-4">
            <p className="font-semibold">{t}</p>
            <p className="mt-1 text-sm text-ink-muted">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
